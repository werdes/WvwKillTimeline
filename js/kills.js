var m_oHighchartsKills;
var m_bDebug = false;
var m_oDataTableRanking = null;
var m_bFlattening = true;

var _STATISTICS_VIEW = null;

$(function () {
    checkNightmode();
    new Clipboard('#copy-shortlink');
    setCurrentMatchlistMainMenu();

    var oApp = $.sammy(function () {
        this.get('#/matches/current/', function (context) {
            setCurrentMatchlist();
        });
        this.get('#/matches/all/', function (context) {
            setAllMatchlist();
        });
        this.get('#/worldranking/', function (context) {
            setWorldRanking();
        });
        this.get('#/matches/:slug/', function (context) {
            var cSlug = this.params['slug'];
            resolveSlug(cSlug, function (oSlug) {
                setSpecificMatch(oSlug.match_id);
            });
        });
        this.get('#/legal/', function (context) {
            setView(ENUM_VIEW.NONE);
            setLoading(true);

            $('#legal-notice').load("legal.html");

            setLoading(false);
            setView(ENUM_VIEW.LEGAL);
        });
    });

    oApp.run('#/matches/current/');
});

var ENUM_VIEW = {
    NONE: 0,
    MATCHLIST: 1,
    MATCH: 2,
    WORLD_RANKING: 3,
    LEGAL: 4
}

$('.nightmode-switch').click(function () {
    toggleNightmode();
});


function checkNightmode() {
    var cNightModeCookie = $.cookie('nightmode');
    if (cNightModeCookie == undefined || cNightModeCookie == null) {
        $.cookie('nightmode', 'false', {
            expires: 365
        });
        cNightModeCookie = $.cookie('nightmode');;
    }
    if (cNightModeCookie == 'false') {
        $('head link[rel="stylesheet"][href="css/nightmode.min.css"]').remove();
    } else {
        $('head').append('<link rel="stylesheet" type="text/css" href="css/nightmode.min.css">');
    }
}

function toggleNightmode() {
    var cNightModeCookie = $.cookie('nightmode');
    if (cNightModeCookie == 'false') {
        $.cookie('nightmode', 'true', {
            expires: 365
        });
    } else {
        $.cookie('nightmode', 'false', {
            expires: 365
        });
    }

    checkNightmode();
};

function setView(nView) {
    $('#matchlist').addClass('hidden');
    $('#match').addClass('hidden');
    $('#world-ranking').addClass('hidden');
    $('#legal-notice').addClass('hidden');
    $('#matchlist-search').val('');

    $('div.header').addClass('disabled');

    if (nView == ENUM_VIEW.NONE) {
        $("body").children(".fixedHeader").each(function () {
            $(this).remove();
        });
        if (m_oDataTableRanking != null) {
            m_oDataTableRanking.clear();
            m_oDataTableRanking.destroy();
            m_oDataTableRanking = null;
        }
    } else
    if (nView == ENUM_VIEW.MATCH) {
        $('#match').removeClass('hidden');
        $('div.header').removeClass('disabled');
    } else if (nView == ENUM_VIEW.MATCHLIST) {
        $('#matchlist').removeClass('hidden');
        $('div.header').removeClass('disabled');
    } else if (nView == ENUM_VIEW.WORLD_RANKING) {
        $('#world-ranking').removeClass('hidden');
        $('div.header').removeClass('disabled');
    } else if (nView == ENUM_VIEW.LEGAL) {
        $('#legal-notice').removeClass('hidden');
        $('div.header').removeClass('disabled');
    }
}

function getMaps(aWorlds) {
    var aMaps = new Array();
    aMaps[38] = 'Eternal Battlegrounds';
    aMaps[94] = aWorlds['red'] + " Borderlands";
    aMaps[95] = aWorlds['green'] + " Borderlands";
    aMaps[96] = aWorlds['blue'] + " Borderlands";
    aMaps[1099] = aWorlds['red'] + " Borderlands";
    return aMaps;
}

function getMapColors() {
    var aMaps = new Array();
    aMaps[38] = '#333';
    aMaps[94] = 'red';
    aMaps[95] = 'green';
    aMaps[96] = 'blue';
    aMaps[1099] = 'red';
    return aMaps;
}

function getWorlds(oMatch) {
    var aWorlds = new Array();
    aWorlds['red'] = null;
    aWorlds['green'] = null;
    aWorlds['blue'] = null;

    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        aWorlds[oSeries.color] = oSeries.world_name;
    };
    return aWorlds;
}

function resolveSlug(cSlug, callback) {
    $.ajax({
        url: "api/slug/" + cSlug + "?" + $.now(),
        caching: false,
        dataType: "json",
        complete: function (oData) {
            if (oData != null && oData.responseJSON != null) {
                callback(oData.responseJSON);
            }
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
            setView(ENUM_VIEW.MATCHLIST);
        }
    })
}

function setSpecificMatch(cRequestedMatchId) {
    setLoading(true);
    setView(ENUM_VIEW.NONE);

    $.ajax({
        url: "api/matchlist/single/" + cRequestedMatchId + "?" + $.now(),
        caching: false,
        dataType: "json",
        complete: function (oData) {
            for (var cCurrentMatchId in oData.responseJSON) {
                var oMatch = oData.responseJSON[cCurrentMatchId];
                if (oMatch.id == cRequestedMatchId) {
                    setMatch(oMatch.id, oMatch);
                    break;
                }
            }
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
            setView(ENUM_VIEW.MATCHLIST);
        }
    })
}

function setWorldRanking() {
    setView(ENUM_VIEW.NONE);
    setLoading(true);
    $.ajax({
        url: "api/worldranking?" + $.now(),
        dataType: "json",
        complete: function (oData) {
            m_oDataTableRanking = $('#table-world-ranking').DataTable({
                "order": [
                    [6, "desc"]
                ],
                "paging": false,
                "info": false,
                "searching": true
            });

            for (var nWorldId in oData.responseJSON) {
                var oWorld = oData.responseJSON[nWorldId];

                for (var nLinking in oWorld.linkings) {
                    var oLinking = oWorld.linkings[nLinking];
                    var cPartners = '';
                    var i = 0;
                    for (var nPartner in oLinking.partners) {
                        if (i == 0) {
                            cPartners += ', ';
                        }
                        cPartners += oLinking.partners[nPartner].name;
                        i++;

                        if (i < oLinking.partners.length) {
                            cPartners += ', ';
                        }
                    }

                    var cLeadingWorldName = '<i class="famfamfam-flag-' + getFlagShort(oWorld.arenanet_id) + '"></i> <b>' + oWorld.name + '</b>';

                    m_oDataTableRanking.row.add([cLeadingWorldName + cPartners, oLinking.matchcount.toString(), oLinking.kills.toThousandSeparator(), oLinking.deaths.toThousandSeparator(), (oLinking.kills / oLinking.matchcount).toFixed(2).toString(), (oLinking.deaths / oLinking.matchcount).toFixed(2).toString(), getKdr(oLinking.kills, oLinking.deaths)]).draw(false);
                }

            }

            setView(ENUM_VIEW.WORLD_RANKING);
            setLoading(false);
            new $.fn.dataTable.FixedHeader(m_oDataTableRanking, {

            });
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });
}

function setAllMatchlist() {
    var cContainerId = '#matchlist-container';

    setLoading(true);
    $(cContainerId).html("");
    resetView();
    setView(ENUM_VIEW.NONE);

    $.ajax({
        url: "api/matchlist/all?" + $.now(),
        dataType: "json",
        complete: function (oData) {

            setView(ENUM_VIEW.NONE)

            var cLastStartDate = "";
            for (var cMatchId in oData.responseJSON) {

                var oMatch = oData.responseJSON[cMatchId];
                var cCurrStartDate = moment(oMatch.start).utc().format('YYYY.MM.DD');
                if (cCurrStartDate != cLastStartDate) {
                    $(cContainerId).append('<h2>' + moment(oMatch.start).format('YYYY.MM.DD') + ' - ' + moment(oMatch.end).format('YYYY.MM.DD') + '</h2>');
                    cLastStartDate = cCurrStartDate;
                }
                setMatchlistMatchContainer(cContainerId, cMatchId, oMatch);
            };
            setLoading(false);
            setView(ENUM_VIEW.MATCHLIST);

        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });

}

function setCurrentMatchlistMainMenu() {
    var cMenuContainerId = '#menu-current-matchups';
    $.ajax({
        url: "api/matchlist/current?" + $.now(),
        dataType: "json",
        complete: function (oData) {

            for (var cMatchId in oData.responseJSON) {
                var oMatch = oData.responseJSON[cMatchId];
                var cTier = oMatch.arenanet_id.split('-')[1];
                var cRegion = oMatch.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";
                var cUrl = '#/matches/' + getLongestInArray(oMatch.slugs) + "/";


                $(cMenuContainerId).append('<li data-match-id="' + oMatch.id + '" id="menu-' + cMatchId + '"></li>');
                var cMenuContainer = '<a href="' + cUrl + '"><b>' + cRegion + "</b>/<b>T" + cTier + "</b> ";
                var i = 0;
                for (var cWorldId in oMatch.worlds) {
                    var oWorld = oMatch.worlds[cWorldId];
                    if (i > 0) {
                        cMenuContainer += " - ";
                    }
                    cMenuContainer += '<i class="famfamfam-flag-' + getFlagShort(oWorld.id) + '"></i> ';
                    cMenuContainer += oWorld.name;

                    i++;
                }
                cMenuContainer += '</a>';
                $('#menu-' + cMatchId).append(cMenuContainer);

                $('#menu-' + cMatchId).click(function () {
                    $('#current-matches-dropdown').dropdown('toggle');
                });
            };
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });
}

function setCurrentMatchlist() {
    var cContainerId = '#matchlist-container';
    $(cContainerId).html("");
    setView(ENUM_VIEW.NONE);
    setLoading(true);

    $.ajax({
        url: "api/matchlist/current?" + $.now(),
        dataType: "json",
        complete: function (oData) {
            setView(ENUM_VIEW.NONE);

            for (var cMatchId in oData.responseJSON) {
                setMatchlistMatchContainer(cContainerId, cMatchId, oData.responseJSON[cMatchId]);
            };

            setLoading(false);
            setView(ENUM_VIEW.MATCHLIST);
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });
}

function setMatchlistMatchContainer(cContainerId, cMatchId, oMatch) {
    var cTier = oMatch.arenanet_id.split('-')[1];
    var cRegion = oMatch.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";
    var cDebugInfo = (m_bDebug ? cMatchId : "");

    var aSearchQuery = new Array();
    aSearchQuery.push("T" + cTier);
    aSearchQuery.push("Tier" + cTier);
    aSearchQuery.push(cRegion);
    aSearchQuery.push(oMatch.start);
    aSearchQuery.push(oMatch.end);
    aSearchQuery.push(moment(oMatch.start).format('YYYY.MM.DD'));
    aSearchQuery.push(moment(oMatch.end).format('YYYY.MM.DD'));

    var cUrl = '#/matches/' + getLongestInArray(oMatch.slugs) + "/";
    console.log(cUrl);

    $(cContainerId).append('<div id="' + cMatchId + '" class="list-group-item"><div class="row"><div class="col-md-1"><div class="matchlist-eyecatcher"><span class="matchlist-region">' + cRegion + '</span><span class="matchlist-tier">Tier ' + cTier + '</span></div></div><div class="col-md-9"><a class="match-container" data-match-id="' + oMatch.id + '"></a></div><div class="col-md-2"><a class="get-shortlink btn btn-default btn-xs pull-right" data-toggle="modal" data-target="#modal-shortlink" role="button" data-match-slug="' + getLongestInArray(oMatch.slugs) + '"><i class="glyphicon glyphicon-link"></i> Shortlink</a><span class="matchlist-last-update pull-right">updated ' + moment.utc(oMatch.last_update).local().fromNow() + '</span>' + cDebugInfo + '</div></div></div>');

    var cContainer = '<div class="matchlist-worldlist">';

    for (var cWorldId in oMatch.worlds) {
        var oWorld = oMatch.worlds[cWorldId];
        var nKD = parseInt(oWorld.kills) / parseInt(oWorld.deaths);
        var cLabelClass = nKD >= 1 ? "success" : "danger";
        cContainer += '<div class="row"><div class="col-md-1">';

        cContainer += '<span title="Kills: ' + oWorld.kills + ' / Deaths: ' + oWorld.deaths + '" class="label label-' + cLabelClass + '">KD: ' + getKdr(oWorld.kills, oWorld.deaths) + '</span>';


        cContainer += '</div><div class="col-md-11 matchlist-world-container"><b><i class="famfamfam-flag-' + getFlagShort(oWorld.id) + '"></i> ' + oWorld.name + '</b>';

        aSearchQuery.push(oWorld.name);

        if (oWorld.additional_worlds != null) {
            for (var cAdditionalWorldId in oWorld.additional_worlds) {
                cContainer += ', ' + oWorld.additional_worlds[cAdditionalWorldId].name;

                aSearchQuery.push(oWorld.additional_worlds[cAdditionalWorldId].name);
            }
        }
        cContainer += '</div></div>';
    }
    cContainer += "</a></div>";
    $("#" + cMatchId + ' a.match-container').append(cContainer);

    $('#' + cMatchId).attr('data-search-query', aSearchQuery.join('#'));

    $('#' + cMatchId + " a.match-container").click(function () {
        window.location = cUrl;
    });
}

$('#modal-shortlink').on('shown.bs.modal', function (event) {
    var oSender = $(event.relatedTarget);
    var cMatchSlug = oSender.attr('data-match-slug');
    var cShortlink = window.location.href; //.split('#')[0] + "#/matches/" + cMatchSlug + "/";

    $('#shortlink-textbox').val(cShortlink);
    $('#shortlink-textbox').select();
})


function setMatch(cMatchId, oMatchlistMatch) {

    setView(ENUM_VIEW.NONE);
    setLoading(true);
    resetView();

    m_oHighchartsKills = new Highcharts.stockChart(getChartOptions());
    $('#disable-flattening').removeClass('hidden');
    $('#enable-flattening').removeClass('hidden');

    var cFlatteningOption = m_bFlattening ? "flattened" : "unaltered";

    $.ajax({
        url: "api/match/" + cMatchId + "/" + cFlatteningOption + "?" + $.now(),
        dataType: "json",
        complete: function (oData) {
            var oMatch = oData.responseJSON;
            var i = 0;
            var aWorlds = getWorlds(oMatch);
            var aMaps = getMaps(aWorlds);
            var nKillsMax = 0;
            var nDeathsMin = 0;

            var cTier = oMatchlistMatch.arenanet_id.split('-')[1];
            var cRegion = oMatchlistMatch.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";
            var cLongestSlug = getLongestInArray(oMatchlistMatch.slugs);

            $('div#match > a.get-shortlink').attr('data-match-slug', cLongestSlug);

            $('#match-title').html(moment(oMatch.match_start).format("YYYY.MM.DD") + " - " + moment(oMatch.match_end).format("YYYY.MM.DD") + " <small>" + cRegion + " Tier " + cTier + "</small>");

            $('#match-last-update').html("Last updated at " + moment.utc(oMatch.last_update).local().format("HH:mm:ss") + " (" + moment.utc(oMatch.last_update).local().fromNow() + ")");

            m_oHighchartsKills.setTitle({
                text: aWorlds['green'] + " / " + aWorlds['blue'] + " / " + aWorlds['red']
            });

            $('#disable-flattening').addClass('hidden');
            $('#enable-flattening').addClass('hidden');
            if (oMatch.flattening_requested && oMatch.flattened) {
                $('#disable-flattening').removeClass('hidden');
            } else if (!oMatch.flattening_requested) {
                $('#enable-flattening').removeClass('hidden');
            }
            var nSeriesItemIndex = 0;
            var oFirstSeries = oMatch.series[Object.keys(oMatch.series)[0]];
            for (var cSeriesItemKey in oFirstSeries.series_items) {
                var oSeriesItem = oFirstSeries.series_items[cSeriesItemKey];
                var nSumKills = 0;
                var nSumDeaths = 0;
                for (var cSeriesKey in oMatch.series) {
                    oSeries = oMatch.series[cSeriesKey];
                    nSumKills += parseInt(oSeries.series_items[nSeriesItemIndex].kills);
                    nSumDeaths += parseInt(oSeries.series_items[nSeriesItemIndex].deaths);
                };
                if (nSumKills > nKillsMax) {
                    nKillsMax = nSumKills;
                }
                if (nSumDeaths > nDeathsMin) {
                    nDeathsMin = nSumDeaths;
                }

                nSeriesItemIndex++;
            }

            var nMax = nKillsMax;
            if (nDeathsMin > nMax) {
                nMax = nDeathsMin;
            }

            nDeathsMin *= -1;
            m_oHighchartsKills.yAxis[0].update({
                min: nMax * -1 - 100,
                max: 0,
            });
            m_oHighchartsKills.yAxis[1].update({
                min: 0,
                max: nMax + 100
            });


            for (var cSeriesKey in oMatch.series) {
                setSeries(oMatch.series[cSeriesKey], aWorlds, aMaps, i, "Kills");
                i++;
            };

            for (var cSeriesKey in oMatch.series) {
                setSeries(oMatch.series[cSeriesKey], aWorlds, aMaps, i, "Deaths");
                i++;
            };


            $('#reload-chart').attr('data-match-id', cMatchId);
            $('#disable-flattening').attr('data-match-id', cMatchId);
            $('#enable-flattening').attr('data-match-id', cMatchId);

            if (oMatch.flattened) {
                setMessage("Due to issues with the <strong>Guild Wars 2 API</strong> the data of this match has been flattened to be more precise.<br />Please note, that this has altered the timeline of when kills occured. The kill and death counts are correct. I know it's not pretty, but that's as much as i can do 🔥.", "warning");
            }

            //Statistik
            setStatisticsView(oMatch);
            initMatchStatistics(oMatch, oMatchlistMatch);
            setStatistics(-1);

            m_oHighchartsKills.redraw();
            setLoading(false);

            setView(ENUM_VIEW.MATCH);

        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    })
}

function setStatisticsView(oMatch) {
    _STATISTICS_VIEW = {
        worlds: {},
        timeslots: {}
    };


    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        var cMapId = oSeries.map_id;
        var cWorldId = oSeries.world_id;

        if (!_STATISTICS_VIEW.worlds[cWorldId]) {

            _STATISTICS_VIEW.worlds[cWorldId] = {
                world_name: oSeries.world_name,
                world_id: oSeries.world_id,
                color: oSeries.color,
                maps: {}
            }
        }

        if (!_STATISTICS_VIEW.worlds[cWorldId].maps[cMapId]) {
            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId] = {
                map_id: oSeries.map_id,
                kills: 0,
                deaths: 0
            }
        }

        for (var nSeriesItemIndex in oSeries.series_items) {
            var oSeriesItem = oSeries.series_items[nSeriesItemIndex];
            var cTimeslotId = oSeriesItem.timeslot_id.toString();

            if (!_STATISTICS_VIEW.timeslots[cTimeslotId]) {
                _STATISTICS_VIEW.timeslots[cTimeslotId] = {
                    timeslot_id: oSeriesItem.timeslot_id,
                    timeslot_start: oSeriesItem.timeslot_start,
                    timeslot_end: oSeriesItem.timeslot_end,
                    worlds: {}
                }
            }

            if (!_STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId]) {
                _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId] = {
                    world_name: oSeries.world_name,
                    world_id: oSeries.world_id,
                    color: oSeries.color,
                    maps: {}
                }
            }

            if (!_STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId]) {
                _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId] = {
                    map_id: oSeries.map_id,
                    kills: 0,
                    deaths: 0
                }
            }

            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId].kills += parseInt(oSeriesItem.kills);
            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId].deaths += parseInt(oSeriesItem.deaths);
            _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId].kills += parseInt(oSeriesItem.kills);
            _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId].deaths += parseInt(oSeriesItem.deaths);
        }
    }
}

function setMessage(cMessage, cType) {
    $('#message-container').append('<div class="alert alert-' + cType + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + cMessage + '</div>');
}

function clearMessages() {
    $('#message-container').html('');
}

$('#reload-chart').click(function () {
    var cMatchId = $(this).attr('data-match-id');

    // setMatch(cMatchId, oMatch);

    setSpecificMatch(cMatchId);

});

$('#disable-flattening').click(function () {
    m_bFlattening = false;
    var cMatchId = $(this).attr('data-match-id');
    setSpecificMatch(cMatchId);
});

$('#enable-flattening').click(function () {
    m_bFlattening = true;
    var cMatchId = $(this).attr('data-match-id');
    setSpecificMatch(cMatchId);
});

function setSeries(oSeries, aWorlds, aMaps, i, cDeathsKills) {
    var bDeaths = cDeathsKills == "Deaths";
    m_oHighchartsKills.addSeries({
        name: '[' + cDeathsKills + '] ' + oSeries.world_name + ' on ' + aMaps[oSeries.map_id],
        yAxis: bDeaths ? 0 : 1,
        type: 'area',
        step: 'center',
        color: getMapChartColor(oSeries.color, oSeries.map_id, bDeaths)
    });

    for (var cSeriesItemKey in oSeries.series_items) {
        var oSeriesItem = oSeries.series_items[cSeriesItemKey];
        var nValue = bDeaths ? (parseInt(oSeriesItem.deaths) * -1) : (parseInt(oSeriesItem.kills));

        var oMarker = null;

        if (oSeriesItem.flattened && i == 0) {
            oMarker = {
                symbol: 'url(img/warning_marker.png)'
            }
        }
        m_oHighchartsKills.series[i].addPoint({
            x: Date.parse(moment.utc(oSeriesItem.timeslot_start).local().format()),
            y: nValue,
            name: '<strong>' + moment.utc(oSeriesItem.timeslot_start).local().format('YYYY/MM/DD | dddd') + '</strong><br />' + moment.utc(oSeriesItem.timeslot_start).local().format('HH:mm:ss ') + ' to ' + moment.utc(oSeriesItem.timeslot_end).local().format('HH:mm:ss '),
            world: oSeries.world_id,
            map: oSeries.map_id,
            kills: parseInt(oSeriesItem.kills),
            deaths: parseInt(oSeriesItem.deaths),
            flattened: oSeriesItem.flattened,
            timeslot_id: oSeriesItem.timeslot_id,
            seriesindex: i,
            marker: oMarker
        }, false);

    };
}

function initMatchStatistics(oMatch, oMatchlistMatch) {
    var cContainerId = '#match-statistics-container';
    var aWorlds = new Array();
    var aWorldColors = getMapColors();

    $(cContainerId).html('');

    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        var cKey = oSeries.world_id; // + '_' + oSeries.color;
        if (typeof aWorlds[cKey] === 'undefined') {
            aWorlds[cKey] = {
                world_id: oSeries.world_id,
                color: oSeries.color,
                world_name: oSeries.world_name,
                maps: new Array()
            };
        }
        aWorlds[cKey].maps[oSeries.map_id] = {
            map_id: oSeries.map_id
        };
    }


    var cContainerContent = '<div class="row">';
    for (var cWorldKey in aWorlds) {
        oWorld = aWorlds[cWorldKey];
        cContainerContent += '<div class="col-md-4 world-container ' + oWorld.world_id + '" data-world-name="' + oWorld.world_name + '">';
        cContainerContent += '<div class="row"><div class="col-md-9"><h4>' + oWorld.world_name + '</h4><span class="copy-statistics copy-' + oWorld.world_id + '" title="Copy statistics to clipboard"><i class="glyphicon glyphicon-copy"></i></span></div><div class="col-md-3"><h4 class=" world-kd ' + oWorld.world_id + '"></h4></div></div><h6>';

        var i = 0;
        for (var cAddtionalWorldKey in oMatchlistMatch.worlds[oWorld.color].additional_worlds) {
            i++;
            cContainerContent += oMatchlistMatch.worlds[oWorld.color].additional_worlds[cAddtionalWorldKey].name;
            if (i < Object.keys(oMatchlistMatch.worlds[oWorld.color].additional_worlds).length) {
                cContainerContent += ", ";
            }
        }
        cContainerContent += "&nbsp;</h6>"

        for (var cMapId in oWorld.maps) {
            var oMap = oWorld.maps[cMapId];
            var cMapName = oMap.map_id == "38" ? "EBG" : "Border";

            cContainerContent += '<div class="row kd" data-world="' + oWorld.world_id + '" data-map-id="' + cMapId + '" data-color="' + aWorldColors[oMap.map_id] + '" data-world-name="' + oWorld.world_name + '" data-map-name="' + cMapName + '">';

            cContainerContent += '<div class="col-md-2" style="color: ' + aWorldColors[oMap.map_id] + '">' + cMapName + '</div><div class="col-md-7"><div class="progress"><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' kills no-nightmode" title="kills" role="progressbar" style="width: 50%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, false) + ';"  ></div><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' deaths no-nightmode" style="width: 50%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, true) + ';" title="deaths"></div></div></div><div class="col-md-3 ' + cMapId + ' ' + oWorld.world_id + ' kdr"></div>';

            cContainerContent += '</div>';
        }

        cContainerContent += '<div class="row kd-total" data-world="' + oWorld.world_id + '"><div class="col-md-2"><strong>Total</strong></div><div class="col-md-7"><div class="progress"><div class="progress-bar kills total ' + oWorld.world_id + '  no-nightmode" title="kills" role="progressbar" style="width: 50%; background-color: ' + shadeColor(colorNameToHex(oWorld.color), 0.3) + ';"  ></div><div class="progress-bar ' + oWorld.world_id + ' total deaths no-nightmode" style="width: 50%; background-color: ' + shadeColor(colorNameToHex(oWorld.color), -0.3) + ';" title="deaths"></div></div></div><div class="col-md-3"><strong><span class="kdr total ' + oWorld.world_id + ' "></span></strong></div></div>';

        cContainerContent += "</div>";
    }
    cContainerContent += '</div>';

    $(cContainerId).append(cContainerContent);

    $('span.copy-statistics').click(function () {
        $(this).addClass('highlight');
        setTimeout(function () {
            $('.highlight').removeClass('highlight');
        }, 1000);
    });

    for (var cWorldKey in aWorlds) {

        $('.copy-' + aWorlds[cWorldKey].world_id).attr('data-clipboard-text', getClipboardWorld(aWorlds[cWorldKey].world_id));
        new Clipboard('.copy-' + aWorlds[cWorldKey].world_id);
    }
}

function setStatistics(nTimeslotId) {
    if (nTimeslotId == -1) {
        //ALL
        for (var nWorldId in _STATISTICS_VIEW.worlds) {
            var oWorld = _STATISTICS_VIEW.worlds[nWorldId];
            setStatisticForWorld(oWorld);
        }
    } else {
        //Timeslot
        for (var nWorldId in _STATISTICS_VIEW.timeslots[nTimeslotId].worlds) {
            var oWorld = _STATISTICS_VIEW.timeslots[nTimeslotId].worlds[nWorldId];
            setStatisticForWorld(oWorld);
        }
    }
}

function setStatisticForWorld(oWorld) {
    var nSumKills = 0;
    var nSumDeaths = 0;


    for (var nMapId in oWorld.maps) {
        var oMap = oWorld.maps[nMapId];
        var oWidths = getWidths(oMap.kills, oMap.deaths);


        $('.progress-bar.' + oWorld.world_id + '.' + oMap.map_id + ".kills").css("width", oWidths.kills).text(oMap.kills);
        $('.progress-bar.' + oWorld.world_id + '.' + oMap.map_id + ".deaths").css("width", oWidths.deaths).text(oMap.deaths);
        $('.kdr.' + oWorld.world_id + '.' + oMap.map_id).html("&empty;" + getKdr(oMap.kills, oMap.deaths));

        nSumKills += oMap.kills;
        nSumDeaths += oMap.deaths;
    }

    var oTotalWidths = getWidths(nSumKills, nSumDeaths);

    $('.progress-bar.' + oWorld.world_id + '.total.kills').css("width", oTotalWidths.kills).text(nSumKills);
    $('.progress-bar.' + oWorld.world_id + '.total.deaths').css("width", oTotalWidths.deaths).text(nSumDeaths);
    $('.world-kd.' + oWorld.world_id).html("&empty;" + getKdr(nSumKills, nSumDeaths));
    $('.kdr.total.' + oWorld.world_id).html("&empty;" + getKdr(nSumKills, nSumDeaths));
}

function getClipboardWorld(nWorldId) {

    var oWorld = _STATISTICS_VIEW.worlds[nWorldId];

    var nFullDeaths = 0;
    var nFullKills = 0;
    var aMaps = new Array();
    var cWorldName = oWorld.world_name;
    var aWorldColors = getMapColors();

    for (var nMapId in oWorld.maps) {
        var oMap = oWorld.maps[nMapId];
        var nKills = parseInt(oMap.kills);
        var nDeaths = parseInt(oMap.deaths);
        var cWorld = oWorld.world_name;
        var cMap = oMap.map_id == "38" ? "EBG" : "Border";
        var cColor = aWorldColors[oMap.map_id];

        nFullDeaths += nDeaths;
        nFullKills += nKills;

        var cOutput = getKdr(nKills, nDeaths) + ' k/d (' + nKills + '/' + nDeaths + ') on ';
        if (cColor.indexOf('#') == -1) {
            cOutput += cColor.toProperCase() + " ";
        }
        cOutput += cMap;

        aMaps.push(cOutput);
    }


    var cWorldOverall = cWorldName + ": " + getKdr(nFullKills, nFullDeaths) + ' k/d (' + nFullKills + '/' + nFullDeaths + ') | ';

    return cWorldOverall + aMaps.join(' | ');
}

//Resets all Chart series
function resetView() {
    if (m_oHighchartsKills != undefined &&
        m_oHighchartsKills != null) {
        m_oHighchartsKills.destroy();
        m_oHighchartsKills = undefined;
        $('main-chart-container').html('');
    }

    _STATISTICS_VIEW = null;
}

function getFlagShort(cWorldId) {
    var cLeft2 = cWorldId.substring(0, 2);
    switch (cLeft2) {
        case "10":
            return "us";
        case "20":
            return "eu";
        case "21":
            return "fr";
        case "22":
            return "de";
        case "23":
            return "es";
    }
}

function setLoading(bVisible) {
    $('#loading-container').removeClass('hidden');
    if (!bVisible)
        $('#loading-container').addClass('hidden');
    else
        clearMessages();
}

function getChartOptions() {
    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });
    var oChartOptions = {
        chart: {
            backgroundColor: 'transparent',
            renderTo: 'main-chart-container',
            height: 500,
            zoomType: 'xy',
            spacingLeft: 0,
            spacingRight: 0
        },
        rangeSelector: {
            enabled: false
        },
        scrollbar: {
            liveRedraw: false
        },
        navigator: {
            adaptToUpdatedData: false
        },
        xAxis: {
            type: 'datetime',
            range: 24 * 60 * 60 * 1000,
            labels: {
                align: 'left',
                formatter: function () {
                    var oCorrectedDate = moment.utc(this.value).add(15, 'minutes').local().format("HH:mm");
                    return oCorrectedDate;
                }
            }
        },
        title: {
            text: ' '
        },
        yAxis: [{
                allowDecimals: false,
                title: {
                    text: 'deaths'
                },
                opposite: true,
                gridLineWidth: 0,
                visible: false,
                labels: {
                    formatter: function () {
                        return Math.abs(this.value);
                    }
                }
            },
            {
                allowDecimals: false,
                opposite: true,
                gridLineWidth: 0,
                labels: {
                    formatter: function () {
                        return Math.abs(this.value);
                    }
                }
            }
        ],
        plotOptions: {
            area: {
                stacking: 'normal',
                marker: {
                    // width: 10,
                    // height: 10
                }
            }
        },
        series: []
    }
    return oChartOptions;
}

function newGuid() {
    return (S4() + S4() + "-" + S4() + "-4" + S4().substr(0, 3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
}

function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}

function getMapChartColor(cColor, nMapId, bDeaths) {
    var nShade = 0;
    var nIntensity = 1;
    switch (nMapId) {
        case "34":
            nShade = 0.09;
            break;
        case "95":
            nShade = 0.15;
            break;
        case "96":
            nShade = 0.3;
            break;
        case "1099":
        case "97":
            nShade = 0.45;
            break;
    }

    nShade *= nIntensity;

    if (bDeaths) {
        nShade = -0.75 + nShade;
    }

    var a = shadeColor(colorNameToHex(cColor), nShade);
    return a;
}

function colorNameToHex(color) {
    var colors = {
        "blue": "#0000ff",
        "green": "#008000",
        "red": "#ff0000"
    };

    if (typeof colors[color.toLowerCase()] != 'undefined')
        return colors[color.toLowerCase()];

    return false;
}

function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

function blendColors(c0, c1, p) {
    var f = parseInt(c0.slice(1), 16),
        t = parseInt(c1.slice(1), 16),
        R1 = f >> 16,
        G1 = f >> 8 & 0x00FF,
        B1 = f & 0x0000FF,
        R2 = t >> 16,
        G2 = t >> 8 & 0x00FF,
        B2 = t & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((R2 - R1) * p) + R1) * 0x10000 + (Math.round((G2 - G1) * p) + G1) * 0x100 + (Math.round((B2 - B1) * p) + B1)).toString(16).slice(1);
}

Highcharts.Point.prototype.tooltipFormatter = function (bUseHeader) {
    var oPoint = this,
        oSeries = oPoint.series;
    if (oPoint.seriesindex == 0) {

        setStatistics(oPoint.timeslot_id);
    }

    var cFlatteningNote = oPoint.flattened && oPoint.seriesindex == 0 ? '<br />! This value has been altered by the error correction mechanism !' : '';

    return cFlatteningNote;
};

$('#main-chart-container').mouseleave(function () {
    setStatistics(-1);
});

function getWidths(nKills, nDeaths) {
    var oRetVal = null;

    if (nKills == 0 && nDeaths == 0) {
        // oRetVal = [50, 50];
        oRetVal = {
            kills: "50%",
            deaths: "50%"
        }
    } else {
        // oRetVal = [100 * nKills / (nKills + nDeaths), 100 * nDeaths / (nKills + nDeaths)];
        oRetVal = {
            kills: (100 * nKills / (nKills + nDeaths)).toString() + "%",
            deaths: (100 * nDeaths / (nKills + nDeaths)).toString() + "%"
        }
    }

    return oRetVal;
}

function getKdr(nKills, nDeaths) {
    if (nKills > 0) {
        if (nDeaths > 0) {
            return parseFloat(Math.round((nKills / nDeaths) * 100) / 100).toFixed(2);
        }
        return '&infin;';
    }
    return "1.00";
}


function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function checkParameter(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "([^&#]*)"),
        results = regex.exec(location.search);
    return results !== null;
}

$('#matchlist-search').on('input', function () {
    var cQuery = $(this).val().toUpperCase();

    $('#matchlist-container > div').removeClass('hidden');
    $('#matchlist-container > div').each(function () {
        var cItem = $(this).attr('data-search-query').toUpperCase();
        if (cItem.indexOf(cQuery) == -1) {
            $(this).addClass('hidden');
        }
    });
});

$('#matchlist-search').keyup(function (e) {
    if (e.keyCode == 27) {
        $(this).val('');
        $('#matchlist-container > div').removeClass('hidden');
    }
});

function getLongestInArray(aArray) {
    return aArray.sort(function (a, b) {
        return b.length - a.length;
    })[0];
}

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

Number.prototype.toThousandSeparator = function () {
    return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}