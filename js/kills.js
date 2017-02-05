var m_oHighchartsKills;

$(function () {
    if (getParameterByName('match')) {
        setAllMatchlist();
    } else {
        setCurrentMatchlist();
    }
});

$('#show-all-matches').click(function () {
    setAllMatchlist();
});

$('#headline').click(function () {
    setCurrentMatchlist();
})

var ENUM_VIEW = {
    NONE: 0,
    MATCHLIST: 1,
    MATCH: 2
}

function setView(nView) {
    $('#matchlist-container').addClass('hidden');
    $('#main-chart-container').addClass('hidden');
    $('#match-statistics-container').addClass('hidden');

    if (nView == ENUM_VIEW.MATCH) {
        $('#main-chart-container').removeClass('hidden');
        $('#match-statistics-container').removeClass('hidden');
    } else if (nView == ENUM_VIEW.MATCHLIST) {
        $('#matchlist-container').removeClass('hidden');
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

    $.each(oMatch.series, function (cSeriesKey, oSeries) {
        aWorlds[oSeries.color] = oSeries.world_name;
    });
    return aWorlds;
}

function setAllMatchlist() {
    var cContainerId = '#matchlist-container';

    setLoading(true);
    $(cContainerId).html("");
    resetChart();
    setView(ENUM_VIEW.NONE);

    $.ajax({
        url: "inc/matchlist.php?all&" + $.now(),
        dataType: "json",
        complete: function (data) {

            setView(ENUM_VIEW.NONE)
            var oMatchRedirection = null;
            var cMatchRedirectionParameter = getParameterByName('match');

            var cLastStartDate = "";
            $.each(data.responseJSON, function (cMatchId, oMatch) {
                var cCurrStartDate = moment(oMatch.start).utc().format('YYYY.MM.DD');
                if (cCurrStartDate != cLastStartDate) {
                    $(cContainerId).append('<h2>' + moment(oMatch.start).format('DD.MM.YYYY') + ' - ' + moment(oMatch.end).format('DD.MM.YYYY') + '</h2>');
                    cLastStartDate = cCurrStartDate;
                }
                setMatchlistMatchContainer(cContainerId, cMatchId, oMatch);
                if (cMatchRedirectionParameter && cMatchRedirectionParameter == oMatch.id) {
                    oMatchRedirection = oMatch;
                }

            });
            if (oMatchRedirection != null) {
                setMatch(cMatchRedirectionParameter, oMatchRedirection);
            } else {

                $('div#matchlist-container div.list-group-item').click(function () {
                    var cMatchId = $(this).attr('data-match-id');
                    var oMatch = $(this).data('match');
                    setMatch(cMatchId, oMatch);
                });
                setLoading(false);
                setView(ENUM_VIEW.MATCHLIST);
            }
        },
        error: function (oXhr, cStatus, cError) {
            $('#message-container').html('<div class="alert alert-danger" role="alert"><b>' + cStatus + '</b><br />' + cError + '</div>');
        }
    });

}

function setCurrentMatchlist() {
    var cContainerId = '#matchlist-container';
    var cMenuContainerId = '#menu-current-matchups';
    $(cContainerId).html("");
    $(cMenuContainerId).html("");

    $.ajax({
        url: "inc/matchlist.php?current&" + $.now(),
        dataType: "json",
        complete: function (data) {
            setView(ENUM_VIEW.NONE);

            $.each(data.responseJSON, function (cMatchId, oMatch) {

                setMatchlistMatchContainer(cContainerId, cMatchId, oMatch, cMenuContainerId);
            });


            $('ul#menu-current-matchups li').click(function () {
                var cMatchId = $(this).attr('data-match-id');
                var oMatch = $(this).data('match');
                setMatch(cMatchId, oMatch);
            });
            $('div#matchlist-container div.list-group-item').click(function () {
                var cMatchId = $(this).attr('data-match-id');
                var oMatch = $(this).data('match');
                setMatch(cMatchId, oMatch);
            });

            setLoading(false);
            setView(ENUM_VIEW.MATCHLIST);
        },
        error: function (oXhr, cStatus, cError) {
            $('#message-container').html('<div class="alert alert-danger" role="alert"><b>' + cStatus + '</b><br />' + cError + '</div>');
        }
    });
}

function setMatchlistMatchContainer(cContainerId, cMatchId, oMatch, cMenuContainerId) {
    var cTier = oMatch.arenanet_id.split('-')[1];
    var cRegion = oMatch.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";

    $(cContainerId).append('<div id="' + cMatchId + '" data-match-id="' + oMatch.id + '" class="list-group-item"><div class="matchlist-eyecatcher"><span class="matchlist-region">' + cRegion + '</span><span class="matchlist-tier">Tier ' + cTier + '</span></div></div>');

    var cContainer = '<div class="matchlist-worldlist">';
    $.each(oMatch.worlds, function (cWorldId, oWorld) {
        cContainer += '<p><b><i class="famfamfam-flag-' + getFlagShort(oWorld.id) + '"></i> ' + oWorld.name + '</b>';

        if (oWorld.additional_worlds != null) {
            $.each(oWorld.additional_worlds, function (cAdditionalWorldId, oAdditionalWorld) {
                cContainer += ', ' + oAdditionalWorld.name;
            });
        }
        cContainer += '</p>';
    });
    cContainer += "</div>";
    $("#" + cMatchId).append(cContainer);
    $('#' + cMatchId).data('match', oMatch);

    if (cMenuContainerId) {

        $(cMenuContainerId).append('<li data-match-id="' + oMatch.id + '" id="menu-' + cMatchId + '"></li>');
        var cMenuContainer = '<a href="javascript:void(0);"><b>' + cRegion + "</b>/<b>T" + cTier + "</b> ";
        var i = 0;
        $.each(oMatch.worlds, function (cWorldId, oWorld) {
            if (i > 0) {
                cMenuContainer += " - ";
            }
            cMenuContainer += '<i class="famfamfam-flag-' + getFlagShort(oWorld.id) + '"></i> ';
            cMenuContainer += oWorld.name;

            i++;
        });
        cMenuContainer += '</a>';
        $('#menu-' + cMatchId).append(cMenuContainer);
        $('#menu-' + cMatchId).data('match', oMatch);
    }
}


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

            m_oHighchartsKills.setTitle({
                text: aWorlds['green'] + " / " + aWorlds['blue'] + " / " + aWorlds['red']
            });

            var nSeriesItemIndex = 0;
            var oFirstSeries = oMatch.series[Object.keys(oMatch.series)[0]];
            $.each(oFirstSeries.series_items, function (cSeriesItemKey, oSeriesItem) {
                var nSumKills = 0;
                var nSumDeaths = 0;
                $.each(oMatch.series, function (cSeriesKey, oSeries) {
                    nSumKills += parseInt(oSeries.series_items[nSeriesItemIndex].kills);
                    nSumDeaths += parseInt(oSeries.series_items[nSeriesItemIndex].deaths);
                });
                if (nSumKills > nKillsMax) {
                    nKillsMax = nSumKills;
                }
                if (nSumDeaths > nDeathsMin) {
                    nDeathsMin = nSumDeaths;
                }

                nSeriesItemIndex++;
            });

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


            $.each(oMatch.series, function (cSeriesKey, oSeries) {
                setSeries(oSeries, aWorlds, aMaps, i, "Kills");
                i++;
            });

            $.each(oMatch.series, function (cSeriesKey, oSeries) {
                setSeries(oSeries, aWorlds, aMaps, i, "Deaths");
                i++;
            });

            //Statistik
            setMatchStatistics(oMatch, oMatchlistMatch);

            m_oHighchartsKills.redraw();
            setLoading(false);

            setView(ENUM_VIEW.MATCH);

        },
        error: function (oXhr, cStatus, cError) {
            $('#message-container').html('<div class="alert alert-danger" role="alert"><b>' + cStatus + '</b><br />' + cError + '</div>');
        }
    })
}

function setSeries(oSeries, aWorlds, aMaps, i, cDeathsKills) {
    var bDeaths = cDeathsKills == "Deaths";
    m_oHighchartsKills.addSeries({
        name: '[' + cDeathsKills + '] ' + oSeries.world_name + ' on ' + aMaps[oSeries.map_id],
        yAxis: bDeaths ? 0 : 1,
        type: 'area',
        step: 'center',
        color: getMapChartColor(oSeries.color, oSeries.map_id, bDeaths),
    });
    $.each(oSeries.series_items, function (cSeriesItemKey, oSeriesItem) {
        var nValue = bDeaths ? (parseInt(oSeriesItem.deaths) * -1) : (parseInt(oSeriesItem.kills));
        m_oHighchartsKills.series[i].addPoint({
            x: Date.parse(oSeriesItem.timeslot_start),
            y: nValue,
            name: oSeriesItem.timeslot_start + ' to ' + oSeriesItem.timeslot_end,
            world: oSeries.world_id,
            map: oSeries.map_id,
            kills: parseInt(oSeriesItem.kills),
            deaths: parseInt(oSeriesItem.deaths)
        }, false);

    });
}

function setMatchStatistics(oMatch, oMatchlistMatch) {
    var cContainerId = '#match-statistics-container';
    var aWorlds = new Array();
    var aWorldColors = getMapColors();

    $(cContainerId).html('');

    $.each(oMatch.series, function (cSeriesKey, oSeries) {
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

        $.each(oSeries.series_items, function (cSeriesItemKey, oSeriesItem) {
            aWorlds[cKey].maps[oSeries.map_id].kills += parseInt(oSeriesItem.kills);
            aWorlds[cKey].maps[oSeries.map_id].deaths += parseInt(oSeriesItem.deaths);
        });
    });


    var cContainerContent = '<div class="row">';
    for (var cWorldKey in aWorlds) {
        oWorld = aWorlds[cWorldKey];
        cContainerContent += '<div class="col-md-4 world-container">';
        cContainerContent += '<div class="row"><div class="col-md-9"><h4>' + oWorld.world_name + '</h4></div><div class="col-md-3 world-kd ' + oWorld.world_id + '"><h4>&empty;1.00</h4></div></div><h6>';

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

            cContainerContent += '<div class="row kd" data-kills="' + oMap.kills + '" data-deaths="' + oMap.deaths + '" data-world="' + oWorld.world_id + '">';

            cContainerContent += '<div class="col-md-2" style="color: ' + aWorldColors[oMap.map_id] + '">' + cMapName + '</div><div class="col-md-7"><div class="progress"><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' kills" title="kills" role="progressbar" style="width: ' + aWidths[0] + '%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, false) + ';"  >' + oMap.kills + '</div><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' deaths" style="width: ' + aWidths[1] + '%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, true) + ';" title="deaths">' + oMap.deaths + '</div></div></div><div class="col-md-3 ' + cMapId + ' ' + oWorld.world_id + ' kdr">&empty;' + cKDR + '</div>';

            cContainerContent += '</div>';
        }
        cContainerContent += '</div>';
    }
    cContainerContent += '</div>';

    $(cContainerId).append(cContainerContent);

    for(var cWorldKey in aWorlds) {
        for(var cMap in aWorlds[cWorldKey].maps) {
            setWorldKdr(aWorlds[cWorldKey].world_id, aWorlds[cWorldKey].maps[cMap].kills, aWorlds[cWorldKey].maps[cMap].deaths);
        }
    }
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
            break;

        case "20":
            return "eu";
            break;

        case "21":
            return "fr";
            break;

        case "22":
            return "de";
            break;

        case "23":
            return "es";
            break;
    }
}

function setLoading(bVisible) {
    $('#loading-container').removeClass('hidden');
    if (!bVisible)
        $('#loading-container').addClass('hidden');
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
            zoomType: 'xy'
        },
        rangeSelector: {
            enabled: false
        },
        xAxis: {
            type: 'datetime',
            range: 24 * 60 * 60 * 1000,
            labels: {
                align: 'left'
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
                title: {
                    text: 'kills / deaths'
                },
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
                stacking: 'normal'
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

    return (!bUseHeader ? ('<b>x = ' + (oPoint.name || oPoint.x) + ',</b> ') : '');
    /*['<span style="color:' + oSeries.color + '">', oSeries.name, '</span>: ',
        (!bUseHeader ? ('<b>x = ' + (oPoint.name || oPoint.x) + ',</b> ') : ''),
        '<b>', (!bUseHeader ? 'y = ' : ''), Highcharts.numberFormat(Math.abs(oPoint.y), 0), '</b><br />'
    ].join('');*/
};

$('#main-chart-container').mouseleave(function () {
    $('.row.kd').each(function () {
        setTotalNumbersInStatistics(this);
    })
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

function setWorldKdr(nWorld, nKills, nDeaths) {
    var cSelectorWorld = '.world-kd.' + nWorld;

    var nCount = $(cSelectorWorld).attr('data-count');
    if (typeof nCount === 'undefined') {
        $(cSelectorWorld).attr('data-count', 0);
        $(cSelectorWorld).attr('data-kills', 0);
        $(cSelectorWorld).attr('data-deaths', 0);
        nCount = 0;
    }
    else {
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