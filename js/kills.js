var m_oHighchartsKills;
var m_bDebug = false;
var m_oDataTableRanking = null;

$(function () {
    new Clipboard('#copy-shortlink');
    setCurrentMatchlistMainMenu();
    if (checkParameter('match')) {
        resolveSlug(getParameterByName('match'), function (oSlug) {
            setSpecificMatch(oSlug.match_id);
        });
    } else if (checkParameter('ranking')) {
        setWorldRanking();
    } else {
        setCurrentMatchlist();
    }

});

$('#show-all-matches').click(function () {
    setAllMatchlist(0);
});

$('#headline').click(function () {
    setCurrentMatchlist();
})

$('#show-world-ranking').click(function () {
    setWorldRanking();
})

var ENUM_VIEW = {
    NONE: 0,
    MATCHLIST: 1,
    MATCH: 2,
    WORLD_RANKING: 3
}

function setView(nView) {
    $('#matchlist').addClass('hidden');
    $('#match').addClass('hidden');
    $('#world-ranking').addClass('hidden');
    $('#matchlist-search').val('');

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
    } else if (nView == ENUM_VIEW.MATCHLIST) {
        $('#matchlist').removeClass('hidden');
    } else if (nView == ENUM_VIEW.WORLD_RANKING) {
        $('#world-ranking').removeClass('hidden');
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
        url: "inc/slug.php?slug=" + cSlug + "&" + $.now(),
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
        url: "inc/matchlist.php?all&" + $.now(),
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
        url: "inc/world_ranking.php?" + $.now(),
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

function setAllMatchlist(nStep) {
    var cContainerId = '#matchlist-container';

    setLoading(true);
    $(cContainerId).html("");
    resetChart();
    setView(ENUM_VIEW.NONE);

    $.ajax({
        url: "inc/matchlist.php?all&step=" + nStep + "&" + $.now(),
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

            $('div#matchlist-container div.list-group-item a.match-container').click(function () {
                var cMatchId = $(this).attr('data-match-id');
                var oMatch = $(this).data('match');
                setMatch(cMatchId, oMatch);
            });

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
        url: "inc/matchlist.php?current&" + $.now(),
        dataType: "json",
        complete: function (oData) {

            for (var cMatchId in oData.responseJSON) {
                var oMatch = oData.responseJSON[cMatchId];
                var cTier = oMatch.arenanet_id.split('-')[1];
                var cRegion = oMatch.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";

                $(cMenuContainerId).append('<li data-match-id="' + oMatch.id + '" id="menu-' + cMatchId + '"></li>');
                var cMenuContainer = '<a href="javascript:void(0);"><b>' + cRegion + "</b>/<b>T" + cTier + "</b> ";
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
                $('#menu-' + cMatchId).data('match', oMatch);
            };


            $('ul#menu-current-matchups li').click(function () {
                var cMatchId = $(this).attr('data-match-id');
                var oMatch = $(this).data('match');
                setMatch(cMatchId, oMatch);
            });
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
        url: "inc/matchlist.php?current&" + $.now(),
        dataType: "json",
        complete: function (oData) {
            setView(ENUM_VIEW.NONE);

            for (var cMatchId in oData.responseJSON) {
                setMatchlistMatchContainer(cContainerId, cMatchId, oData.responseJSON[cMatchId]);
            };

            $('div#matchlist-container div.list-group-item a.match-container').click(function () {
                var cMatchId = $(this).attr('data-match-id');
                var oMatch = $(this).data('match');
                setMatch(cMatchId, oMatch);
            });

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

    $(cContainerId).append('<div id="' + cMatchId + '" class="list-group-item"><div class="row"><div class="col-md-1"><div class="matchlist-eyecatcher"><span class="matchlist-region">' + cRegion + '</span><span class="matchlist-tier">Tier ' + cTier + '</span></div></div><div class="col-md-10"><a class="match-container" data-match-id="' + oMatch.id + '"></a></div><div class="col-md-1"><a class="get-shortlink btn btn-default btn-xs pull-right" data-toggle="modal" data-target="#modal-shortlink" role="button" data-match-slug="' + getLongestInArray(oMatch.slugs) + '"><i class="glyphicon glyphicon-link"></i> Shortlink</a>' + cDebugInfo + '</div></div></div>');

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
    $('#' + cMatchId + ' a.match-container').data('match', oMatch);
    $('#' + cMatchId).attr('data-search-query', aSearchQuery.join('#'));
}

$('#modal-shortlink').on('shown.bs.modal', function (event) {
    var oSender = $(event.relatedTarget);
    var cMatchSlug = oSender.attr('data-match-slug');
    var cShortlink = window.location.href.replace("#", "").split('?')[0] + "?match=" + cMatchSlug;

    $('#shortlink-textbox').val(cShortlink);
    $('#shortlink-textbox').select();
})


function setMatch(cMatchId, oMatchlistMatch) {

    setView(ENUM_VIEW.NONE);
    setLoading(true);
    resetChart();

    m_oHighchartsKills = new Highcharts.stockChart(getChartOptions());

    $.ajax({
        url: "inc/match.php?match_id=" + cMatchId + "&" + $.now(),
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

            $('div#match > a.get-shortlink').attr('data-match-slug', getLongestInArray(oMatchlistMatch.slugs));

            $('#match-title').html(moment(oMatch.match_start).format("YYYY.MM.DD") + " - " + moment(oMatch.match_end).format("YYYY.MM.DD") + " <small>" + cRegion + " Tier " + cTier + "</small>");

            m_oHighchartsKills.setTitle({
                text: aWorlds['green'] + " / " + aWorlds['blue'] + " / " + aWorlds['red']
            });

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

            //Statistik
            setMatchStatistics(oMatch, oMatchlistMatch);

            $('#reload-chart').attr('data-match-id', cMatchId);
            $('#reload-chart').data('match', oMatchlistMatch);

            if (oMatch.flattened) {
                setMessage("Due to issues with the <strong>Guild Wars 2-API</strong> the data of this match has been flattened to be more precise.<br />Please note, that this has altered the timeline of when kills occured. The kill and death counts are correct. I know it's not pretty, but that's as much as i can do 🔥.", "warning");
            }

            m_oHighchartsKills.redraw();
            setLoading(false);

            setView(ENUM_VIEW.MATCH);

        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    })
}

function setMessage(cMessage, cType) {
    $('#message-container').append('<div class="alert alert-' + cType + ' alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' + cMessage + '</div>');
}

function clearMessages() {
    $('#message-container').html('');
}

$('#reload-chart').click(function () {

    var oMatch = $(this).data('match');
    var cMatchId = $(this).attr('data-match-id');

    setMatch(cMatchId, oMatch);

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
            x: Date.parse(oSeriesItem.timeslot_start),
            y: nValue,
            name: oSeriesItem.timeslot_start + ' to ' + oSeriesItem.timeslot_end,
            world: oSeries.world_id,
            map: oSeries.map_id,
            kills: parseInt(oSeriesItem.kills),
            deaths: parseInt(oSeriesItem.deaths),
            flattened: oSeriesItem.flattened,
            seriesindex: i,
            marker: oMarker
        }, false);

    };
}

function setMatchStatistics(oMatch, oMatchlistMatch) {
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
            map_id: oSeries.map_id,
            kills: 0,
            deaths: 0
        };

        for (var cSeriesItemKey in oSeries.series_items) {
            var oSeriesItem = oSeries.series_items[cSeriesItemKey];
            aWorlds[cKey].maps[oSeries.map_id].kills += parseInt(oSeriesItem.kills);
            aWorlds[cKey].maps[oSeries.map_id].deaths += parseInt(oSeriesItem.deaths);
        };
    }


    var cContainerContent = '<div class="row">';
    for (var cWorldKey in aWorlds) {
        oWorld = aWorlds[cWorldKey];
        cContainerContent += '<div class="col-md-4 world-container ' + oWorld.world_id + '" data-world-name="' + oWorld.world_name + '">';
        cContainerContent += '<div class="row"><div class="col-md-9"><h4>' + oWorld.world_name + '</h4><span class="copy-statistics copy-' + oWorld.world_id + '" title="Copy statistics to clipboard"><i class="glyphicon glyphicon-copy"></i></span></div><div class="col-md-3 world-kd ' + oWorld.world_id + '"><h4>&empty;1.00</h4></div></div><h6>';

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
            var cKDR = getKdr(oMap.kills, oMap.deaths);

            var aWidths = getWidths(parseInt(oMap.kills), parseInt(oMap.deaths));

            cContainerContent += '<div class="row kd" data-kills="' + oMap.kills + '" data-deaths="' + oMap.deaths + '" data-world="' + oWorld.world_id + '" data-map-id="' + cMapId + '" data-color="' + aWorldColors[oMap.map_id] + '" data-world-name="' + oWorld.world_name + '" data-map-name="' + cMapName + '">';

            cContainerContent += '<div class="col-md-2" style="color: ' + aWorldColors[oMap.map_id] + '">' + cMapName + '</div><div class="col-md-7"><div class="progress"><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' kills" title="kills" role="progressbar" style="width: ' + aWidths[0] + '%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, false) + ';"  >' + oMap.kills + '</div><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' deaths" style="width: ' + aWidths[1] + '%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, true) + ';" title="deaths">' + oMap.deaths + '</div></div></div><div class="col-md-3 ' + cMapId + ' ' + oWorld.world_id + ' kdr">&empty;' + cKDR + '</div>';

            cContainerContent += '</div>';
        }
        cContainerContent += '</div>';
    }
    cContainerContent += '</div>';

    $(cContainerId).append(cContainerContent);

    $('span.copy-statistics').click(function () {
        $(this).addClass('highlight');
        setTimeout(function () {
            $('.highlight').removeClass('highlight');
        }, 1000);
    })
    for (var cWorldKey in aWorlds) {
        for (var cMap in aWorlds[cWorldKey].maps) {
            setWorldKdr(aWorlds[cWorldKey].world_id, aWorlds[cWorldKey].maps[cMap].kills, aWorlds[cWorldKey].maps[cMap].deaths);
        }

        $('.copy-' + aWorlds[cWorldKey].world_id).attr('data-clipboard-text', getClipboardWorld(aWorlds[cWorldKey].world_id));
        new Clipboard('.copy-' + aWorlds[cWorldKey].world_id);
    }
}

function getClipboardWorld(nWorldId) {
    var nFullDeaths = 0;
    var nFullKills = 0;
    var aMaps = new Array();
    var cWorldName = $('.world-container.' + nWorldId).attr('data-world-name');

    $('.world-container.' + nWorldId).children('.row.kd').each(function () {
        var nKills = parseInt($(this).attr('data-kills'));
        var nDeaths = parseInt($(this).attr('data-deaths'));
        var cWorld = $(this).attr('data-world-name');
        var cMap = $(this).attr('data-map-name');
        var cColor = $(this).attr('data-color');

        nFullDeaths += nDeaths;
        nFullKills += nKills;

        var cOutput = getKdr(nKills, nDeaths) + ' k/d (' + nKills + '/' + nDeaths + ') on ';
        if (cColor.indexOf('#') == -1) {
            cOutput += cColor.toProperCase() + " ";
        }
        cOutput += cMap;

        aMaps.push(cOutput);
    });


    var cWorldOverall = cWorldName + ": " + getKdr(nFullKills, nFullDeaths) + ' k/d (' + nFullKills + '/' + nFullDeaths + ') | ';

    return cWorldOverall + aMaps.join(' | ');
}

//Resets all Chart series
function resetChart() {
    if (m_oHighchartsKills != undefined &&
        m_oHighchartsKills != null) {
        m_oHighchartsKills.destroy();
        m_oHighchartsKills = undefined;
        $('main-chart-container').html('');
    }
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
                    var oCorrectedDate = moment(this.value).add(15, 'minutes').format("HH:mm");
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

function colorNameToHex(colour) {
    var colours = {
        "blue": "#0000ff",
        "green": "#008000",
        "red": "#ff0000"
    };

    if (typeof colours[colour.toLowerCase()] != 'undefined')
        return colours[colour.toLowerCase()];

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

    var cSelectorKills = '.progress-bar.kills.' + oPoint.map + '.' + oPoint.world;
    var cSelectorDeaths = '.progress-bar.deaths.' + oPoint.map + '.' + oPoint.world;
    var cSelectorKdr = '.kdr.' + oPoint.map + '.' + oPoint.world;
    var cKDR = getKdr(oPoint.kills, oPoint.deaths);

    var aWidths = getWidths(oPoint.kills, oPoint.deaths);


    $(cSelectorKills).text(oPoint.kills);
    $(cSelectorDeaths).text(oPoint.deaths);
    $(cSelectorKdr).html("&empty;" + cKDR);

    $(cSelectorKills).css("width", aWidths[0] + "%");
    $(cSelectorDeaths).css("width", aWidths[1] + "%");
    setWorldKdr(oPoint.world, oPoint.kills, oPoint.deaths);

    var cFlatteningNote = oPoint.flattened && oPoint.seriesindex == 0 ? '<br />! This value has been altered by the error correction mechanism !' : '';

    return cFlatteningNote; //(bUseHeader ? "b" : "a"); //('<b>x = ' + (oPoint.name || oPoint.x) + ',</b> ') : 'a');
    /*['<span style="color:' + oSeries.color + '">', oSeries.name, '</span>: ',
        (!bUseHeader ? ('<b>x = ' + (oPoint.name || oPoint.x) + ',</b> ') : ''),
        '<b>', (!bUseHeader ? 'y = ' : ''), Highcharts.numberFormat(Math.abs(oPoint.y), 0), '</b><br />'
    ].join('');*/
};

$('#main-chart-container').mouseleave(function () {
    $('.row.kd').each(function () {
        setTotalNumbersInStatistics(this);
    });
});

function setTotalNumbersInStatistics(oHandler) {
    var nKills = $(oHandler).data('kills');
    var nDeaths = $(oHandler).data('deaths');

    var oHandlerDeaths = $(oHandler).find('.progress-bar.deaths');
    var oHandlerKills = $(oHandler).find('.progress-bar.kills');
    var oHandlerKdr = $(oHandler).find('.kdr');

    var aWidths = getWidths(nKills, nDeaths);

    var cKDR = getKdr(nKills, nDeaths);

    $(oHandlerDeaths).text(nDeaths);
    $(oHandlerKills).text(nKills);
    $(oHandlerDeaths).css("width", aWidths[1] + "%");
    $(oHandlerKills).css("width", aWidths[0] + "%");
    $(oHandlerKdr).html("&empty;" + cKDR);

    setWorldKdr($(oHandler).attr('data-world'), nKills, nDeaths);

    m_oHighchartsKills.setTitle({
        text: m_oHighchartsKills.title.textStr
    });
}

function getWidths(nKills, nDeaths) {
    var aRetVal = new Array();

    if (nKills == 0 && nDeaths == 0) {
        aRetVal = [50, 50];
    } else {
        aRetVal = [100 * nKills / (nKills + nDeaths), 100 * nDeaths / (nKills + nDeaths)];
    }

    return aRetVal;
}

function getKdr(nKills, nDeaths) {
    if (nKills > 0) {
        if (nDeaths > 0) {
            return parseFloat(Math.round((nKills / nDeaths) * 100) / 100).toFixed(2);
        }
        return '&infin;';
    }
    return "0.00";
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

function setWorldKdr(nWorld, nKills, nDeaths) {
    var cSelectorWorld = '.world-kd.' + nWorld;

    var nCount = $(cSelectorWorld).attr('data-count');
    if (typeof nCount === 'undefined') {
        $(cSelectorWorld).attr('data-count', 0);
        $(cSelectorWorld).attr('data-kills', 0);
        $(cSelectorWorld).attr('data-deaths', 0);
        nCount = 0;
    } else {
        nCount = parseInt(nCount);
    }

    $(cSelectorWorld).attr('data-count', nCount + 1);
    $(cSelectorWorld).attr('data-kills', parseInt($(cSelectorWorld).attr('data-kills')) + nKills);
    $(cSelectorWorld).attr('data-deaths', parseInt($(cSelectorWorld).attr('data-deaths')) + nDeaths);

    nCount = $(cSelectorWorld).attr('data-count');

    if (nCount == 4) {
        var nKillsSum = parseInt($(cSelectorWorld).attr('data-kills'));
        var nDeathsSum = parseInt($(cSelectorWorld).attr('data-deaths'));
        $(cSelectorWorld).html('<h4>&empty;' + getKdr(nKillsSum, nDeathsSum) + "</h4>");

        $(cSelectorWorld).attr('data-count', 0);
        $(cSelectorWorld).attr('data-kills', 0);
        $(cSelectorWorld).attr('data-deaths', 0);


    }
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