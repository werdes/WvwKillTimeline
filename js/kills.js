var m_oHighchartsKills;
var m_bDebug = false;
var m_oDataTableRanking = null;
var m_bFlattening = true;

var _STATISTICS_VIEW = null;
var _CURSOR = null;
var _WORLDS = null;
// var _API_BASE = "http://localhost:63299/api/";
var _API_BASE = "https://api.kills.werdes.net/api/";
// var _API_BASE = "api/";
var _CURRENT_MATCH_ID;
var _CURRENT_MATCH;
var _SETTINGS = {
    "flattening": true,
    "smoothing": false,
    "darkmode": true,
    "dismissed_objects": new Array(),
    "range_selection": true
}

var ENUM_VIEW = {
    NONE: 0,
    MATCHLIST: 1,
    MATCH: 2,
    WORLD_RANKING: 3,
    LEGAL: 4,
    TIMEZONES: 5
}

var _CURRENT_SELECTED_RANGE = {
    "min": null,
    "max": null
}

$(function () {
    setView(ENUM_VIEW.NONE);
    loadSettings();

    checkDarkmode();
    new Clipboard('#copy-shortlink');
    setCurrentMatchlistMainMenu();
    loadMessages();
    checkTips();

    var oApp = $.sammy(function () {
        this.get('#/matches/current/', function (context) {
            setCurrentMatchlist();
        });
        this.get('#/matches/archive/:page/', function (context) {
            var nPage = this.params['page'];
            alert(nPage);
            setAllMatchlist();
        });
        this.get('#/worldranking/', function (context) {
            setWorldRanking();
        });
        this.get('#/timezones/', function (context) {
            setTimezones();
        })
        this.get('#/matches/:slug/', function (context) {
            var cSlug = this.params['slug'];
            resolveSlug(cSlug, function (oSlug) {
                if (oSlug != null) {
                    setSpecificMatch(oSlug.match_id);
                } else {
                    window.location = '#/matches/current/';
                }
            });
        });
        this.get('#/legal/', function (context) {
            setView(ENUM_VIEW.NONE);
            setLoading(true);

            $('#legal-notice').load("legal.html");

            setLoading(false);
            setView(ENUM_VIEW.LEGAL);
        });
        this.bind('location-changed', function (e, data) {
            handlePageSwitch(e.currentTarget.baseURI);
        });
    });

    oApp.run('#/matches/current/');

    $('#current-year').text(moment().format("YYYY"));
});

function loadSettings() {

    var cookie = $.cookie('settings');
    if (cookie == undefined || cookie == null) {

        storeSettings();
        cookie = $.cookie('settings');;
    }

    var oSettings = JSON.parse(cookie);
    _SETTINGS.darkmode = oSettings.darkmode != undefined ? oSettings.darkmode : _SETTINGS.darkmode;
    _SETTINGS.flattening = oSettings.flattening != undefined ? oSettings.flattening : _SETTINGS.flattening;
    _SETTINGS.smoothing = oSettings.smoothing != undefined ? oSettings.smoothing : _SETTINGS.smoothing;
    _SETTINGS.dismissed_objects = oSettings.dismissed_objects != undefined ? oSettings.dismissed_objects : _SETTINGS.dismissed_objects;

    $('.grp-options li.checkable > a').each(function () {
        $(this).find(".glyphicon").css("opacity", _SETTINGS[$(this).attr("data-target")] ? 1 : 0);
    });
}

function storeSettings() {
    $.cookie('settings', JSON.stringify(_SETTINGS), {
        expires: 365
    });
}

function loadMessages() {
    $.ajax({
        url: "json/messages.json?" + $.now(),
        dataType: "json",
        complete: function (oData) {
            if (oData != null && oData.responseJSON != null) {
                for (var nMessage in oData.responseJSON) {
                    var oMessage = oData.responseJSON[nMessage];
                    setMessage('<strong>' + oMessage.title + '</strong><br />' + oMessage.message, oMessage.level);
                }
            }
        }
    });
}

function handlePageSwitch(targetUri) {
    targetUri = '#' + targetUri.split('#')[1];
    $('div.branding-container, ul.nav-pills>li').removeClass('active');
    $('.branding[href="' + targetUri + '"], ul.nav-pills>li>a[href="' + targetUri + '"]').parent().addClass('active');
}

$('.nightmode-switch').click(function () {
    toggleNightmode();
});


function checkDarkmode() {
    var bDarkmode = _SETTINGS['darkmode'];

    var oLinkObj = $('link[name="bootstrap"]');
    var cCurrentCssFile = $(oLinkObj).attr('href');

    if (bDarkmode) {
        if (!cCurrentCssFile.includes('.dark.')) {
            $(oLinkObj).after($(oLinkObj).clone().attr('href', cCurrentCssFile.replace('.light.', '.dark.')));
            $(oLinkObj).remove();
        }

        $('body').addClass("darkmode");
        $('body').removeClass("lightmode");
        $('html').attr('mode', 'darkmode');
    } else {
        if (cCurrentCssFile.includes('.dark.')) {
            // $('link[name="bootstrap"]').attr('href', 'css/bootstrap/bootstrap.min.css');
            $(oLinkObj).after($(oLinkObj).clone().attr('href', cCurrentCssFile.replace('.dark.', '.light.')));
            $(oLinkObj).remove();
        }

        $('body').removeClass("darkmode");
        $('body').addClass("lightmode");
        $('html').attr('mode', 'lightmode');
    }
    // $('link[href="' + cCurrentCssFile + '"]').remove();
}

function checkTips() {
    checkCopyStatsTip();
    checkTimezonesTip();
    checkRangeselectionTip();
}

function checkCopyStatsTip() {
    if (!_SETTINGS.dismissed_objects.includes("tip_copystats")) {
        $('#information-addon-copystats').removeClass("hidden");
    }
}

function checkTimezonesTip() {
    if (!_SETTINGS.dismissed_objects.includes("tip_timezones")) {
        $('#information-addon-timezones').removeClass("hidden");
    }
}

function checkRangeselectionTip() {
    if (!_SETTINGS.dismissed_objects.includes("tip_timerangeselection")) {
        $('#information-addon-time-range-selection').removeClass("hidden");
    }
}

$('#button-close-tip-copystats').click(function () {
    $('#information-addon-copystats').addClass("hidden");
    _SETTINGS.dismissed_objects.push("tip_copystats");
    storeSettings();
});
$('#button-close-tip-timezones').click(function () {
    $('#information-addon-timezones').addClass("hidden");
    _SETTINGS.dismissed_objects.push("tip_timezones");
    storeSettings();
});
$('#button-close-tip-time-range-selection').click(function () {
    $('#information-addon-time-range-selection').addClass("hidden");
    _SETTINGS.dismissed_objects.push("tip_timerangeselection");
    storeSettings();
});


function toggleNightmode() {
    var bDarkmode = _SETTINGS['darkmode'];

    if (!bDarkmode) {
        _SETTINGS['darkmode'] = true;
    } else {
        _SETTINGS['darkmode'] = false;
    }
    storeSettings();
    checkDarkmode();
};

function setView(nView) {
    $('#matchlist').addClass('hidden');
    $('#match').addClass('hidden');
    $('#world-ranking').addClass('hidden');
    $('#legal-notice').addClass('hidden');
    $('#timezones').addClass('hidden');
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
    } else if (nView == ENUM_VIEW.MATCHLIST) {
        $('#matchlist').removeClass('hidden');
    } else if (nView == ENUM_VIEW.WORLD_RANKING) {
        $('#world-ranking').removeClass('hidden');
    } else if (nView == ENUM_VIEW.LEGAL) {
        $('#legal-notice').removeClass('hidden');
    } else if (nView == ENUM_VIEW.TIMEZONES) {
        $('#timezones').removeClass('hidden');
    }
    $('div.header').removeClass('disabled');
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

function getMapClasses() {
    var aMaps = new Array();
    aMaps[38] = 'ebg';
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

    _WORLDS = {};

    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        aWorlds[oSeries.color] = oSeries.world_name;
        _WORLDS[oSeries.color] = {
            name: oSeries.world_name,
            id: oSeries.world_arenanet_id
        };
    };

    return aWorlds;
}

function resolveSlug(cSlug, callback) {
    $.ajax({
        url: _API_BASE + "slug/" + cSlug + "?ts=" + $.now(),
        caching: false,
        dataType: "json",
        complete: function (oData) {
            if (oData != null && oData.responseJSON != null) {
                callback(oData.responseJSON);
            } else {
                callback(null);
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

    setMatch(cRequestedMatchId);
}

function setTimezones() {
    setView(ENUM_VIEW.NONE);
    setLoading(true);
    $.ajax({
        url: _API_BASE + "timezones?ts=" + $.now(),
        dataType: "json",
        complete: function (oData) {

            var cContent = '<ul class="media-list">';

            for (var nMatchIdx in oData.responseJSON.matches) {
                // oData.responseJSON.matches.forEach(function (oMatch, nMatchIdx) {
                var oMatch = oData.responseJSON.matches[nMatchIdx];
                var cRegion = oMatch.current_match.arenanet_id.split('-')[0] == "1" ? "NA" : "EU";
                var cTier = oMatch.current_match.arenanet_id.split('-')[1];

                cContent += '<li class="media"><div class="pull-left"><div class="timezones-eyecatcher media-object"><span class="timezones-region region-' + cRegion.toLowerCase() + '">' + cRegion + '</span><span class="timezones-tier">Tier ' + cTier + '</span></div></div>  <div class="media-body">';

                for (var cColor in oMatch.worlds) {
                    var oWorld = oMatch.worlds[cColor];
                    cContent += '<div class="row">';
                    cContent += '<div class="col-md-4"><i class="famfamfam-flag-' + getFlagShort(oWorld.linking.host_world.arenanet_id) + '"></i> <strong>' + oWorld.linking.host_world.name + '</strong>';

                    for (var nPartnerWorldIdx in oWorld.linking.partner_worlds) {
                        var oPartnerWorld = oWorld.linking.partner_worlds[nPartnerWorldIdx];
                        cContent += ', <i class="famfamfam-flag-' + getFlagShort(oPartnerWorld.arenanet_id) + '"></i> ' + oPartnerWorld.name;
                    }
                    var nTotalSeconds = 60 * 60 * 24;
                    var nStartSeconds = moment.utc(oWorld.timezone.start_time, 'HH:mm:ss').local().diff(moment().startOf('day'), 'seconds');

                    var nEndSeconds = moment.utc(oWorld.timezone.end_time, 'HH:mm:ss').local().diff(moment().startOf('day'), 'seconds');

                    if (nStartSeconds < 0) {
                        nStartSeconds = moment.utc(oWorld.timezone.start_time, 'HH:mm:ss').local().diff(moment().subtract(1, "days").startOf('day'), 'seconds');
                    }
                    if (nEndSeconds < 0) {
                        var nEndSeconds = moment.utc(oWorld.timezone.end_time, 'HH:mm:ss').local().diff(moment().subtract(1, "days").startOf('day'), 'seconds');

                    }

                    var nEarlyMorningSeconds = 0;

                    if (nEndSeconds > nTotalSeconds) {
                        nEarlyMorningSeconds = nEndSeconds - nTotalSeconds;
                        nEndSeconds = nTotalSeconds;
                    }


                    var nPercentageStart = (nStartSeconds - nEarlyMorningSeconds) / nTotalSeconds * 100;
                    var nPercentageRange = (nEndSeconds - nStartSeconds) / nTotalSeconds * 100;
                    var nPercentageEarlyMorning = nEarlyMorningSeconds / nTotalSeconds * 100;
                    var nPercentageEnd = 100 - nPercentageEarlyMorning - nPercentageStart - nPercentageRange;

                    var oDuration = moment.duration(nEndSeconds - nStartSeconds + nEarlyMorningSeconds + 1, "seconds");
                    var cDuration = oDuration.hours() + "h " + (oDuration.minutes() > 0 ? oDuration.minutes() + "m" : "");



                    var cColorClass = cColor == "red" ? "progress-bar-danger" : (cColor == "green" ? "progress-bar-success" : "");



                    console.log(nStartSeconds + "/" + nEndSeconds + ":" + nPercentageStart + '/' + nPercentageRange);

                    var cTooltip = 'Primetime: ' + moment.utc(oWorld.timezone.start_time, 'HH:mm:ss').local().format("HH:mm") + ' to ' + moment.utc(oWorld.timezone.end_time, 'HH:mm:ss').local().format("HH:mm") + '\r\n' + oWorld.timezone.kill_percentage.toFixed(1) + '% of daily kills \r\n' + oWorld.timezone.death_percentage.toFixed(1) + '% of daily deaths';

                    var cMedals = "";
                    if (oWorld.timezone.activity_rank_in_region == 1) {
                        cMedals = '<span class="timezone-hint timezone-hint-activity" data-container="body" data-toggle="tooltip" data-placement="top" title="Most active primetime in ' + cRegion + ' with ' + oWorld.timezone.activity_per_minute.toFixed(2) + ' kills/deaths per minute" ><i class="icon icon-badge-gold-small"></i> Top Activity in ' + cRegion + '</span>';
                    }
                    if (oWorld.timezone.kdr_rank_in_region == 1) {
                        cMedals += '<span class="timezone-hint timezone-hint-kdr" data-container="body" data-toggle="tooltip" data-placement="top" title="Strongest KDR primetime in ' + cRegion + ': ' + getKdr(oWorld.timezone.kills, oWorld.timezone.deaths) + ' KDR" ><i class="icon icon-badge-kdr-small"></i> Top KDR in ' + cRegion + '</span>';
                    }

                    var cContentBeforeRange = "";
                    var cContentAfterRange = "";

                    if (nPercentageStart > nPercentageEnd) {
                        cContentBeforeRange = cMedals;
                    } else {
                        cContentAfterRange = cMedals;
                    }

                    cContent += '</div><div class="col-md-8"><div class="progress"><div class="progress-bar-early progress-bar ' + cColorClass + '" role="progressbar" style="width:' + nPercentageEarlyMorning + '%;"></div><div class="progress-bar progress-bar-transparent progressbar-before-range" role="progressbar" style="width:' + nPercentageStart + '%;">' + cContentBeforeRange + '</div><div class="progress-bar progress-bar-timezone ' + cColorClass + '" data-container="body"  role="progressbar" data-toggle="tooltip" data-placement="top" title="' + cTooltip + '" style="width:' + nPercentageRange + '%;">' + cDuration + '</div> <div class="progress-bar progress-bar-transparent progressbar-after-range" role="progressbar" style="width:' + nPercentageEnd + '%;">' + cContentAfterRange + '</div></div></div>';

                    // /row
                    cContent += '</div>';
                }


                cContent += '</div></li>';
            };

            cContent += '</ul>';
            $('#timezones-container').html(cContent);
            $('#timezones-last-updated').html('Last updated at ' + moment.utc(oData.responseJSON.last_update).local().format("HH:mm:ss") + " (" + moment.utc(oData.responseJSON.last_update).local().fromNow() + ')');
            $('#timezones-max-timeslots').text(oData.responseJSON.count_timeslots_max);
            $('[data-toggle="tooltip"]').tooltip()
            setView(ENUM_VIEW.TIMEZONES);
            setLoading(false);
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });
}


function setWorldRanking() {
    setView(ENUM_VIEW.NONE);
    setLoading(true);
    $.ajax({
        url: _API_BASE + "worldranking?ts=" + $.now(),
        dataType: "json",
        complete: function (oData) {
            m_oDataTableRanking = $('#table-world-ranking').DataTable({
                "order": [
                    [6, "desc"]
                ],
                "paging": false,
                "info": false,
                "searching": true,
                "columnDefs": [{
                    type: 'percent',
                    targets: 7
                }]
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
                        cPartners += '<br /><i class="famfamfam-flag-' + getFlagShort(oLinking.partners[nPartner].arenanet_id) + '"></i> ' + oLinking.partners[nPartner].name + '';
                        i++;

                        if (i < oLinking.partners.length) {
                            cPartners += ', ';
                        }
                    }

                    var cLeadingWorldName = '<i class="famfamfam-flag-' + getFlagShort(oWorld.arenanet_id) + '"></i> <b>' + oWorld.name + '</b>';

                    m_oDataTableRanking.row.add([
                        cLeadingWorldName + cPartners,
                        oLinking.matchcount.toString(),
                        oLinking.kills.toThousandSeparator(),
                        oLinking.deaths.toThousandSeparator(),
                        (oLinking.kills / oLinking.matchcount).toFixed(2).toString(),
                        (oLinking.deaths / oLinking.matchcount).toFixed(2).toString(),
                        getKdr(oLinking.kills, oLinking.deaths),
                        oLinking.score > 0 ? ((oLinking.kills * oLinking.ppk_value / oLinking.score * 100).toFixed(2)) + "%" : "n/a"
                    ]).draw(false);
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
        url: _API_BASE + "matchlist/all?ts=" + $.now(),
        dataType: "json",
        complete: function (oData) {

            setView(ENUM_VIEW.NONE)

            var cLastStartDate = "";
            for (var cMatchId in oData.responseJSON) {

                var oMatch = oData.responseJSON[cMatchId];
                var cCurrStartDate = moment.utc(oMatch.start).format('YYYY.MM.DD');
                if (cCurrStartDate != cLastStartDate) {
                    $(cContainerId).append('<h2>' + moment.utc(oMatch.start).local().format('YYYY.MM.DD') + ' - ' + moment.utc(oMatch.end).local().format('YYYY.MM.DD') + '</h2></div>');
                    cLastStartDate = cCurrStartDate;
                }
                displayMatchlistMatchContainer(cContainerId, cMatchId, oMatch);
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
        url: _API_BASE + "matchlist/current?ts=" + $.now(),
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
                    cMenuContainer += '<i class="famfamfam-flag-' + getFlagShort(oWorld.arenanet_id) + '"></i> ';
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
        url: _API_BASE + "matchlist/current?ts=" + $.now(),
        dataType: "json",
        complete: function (oData) {
            setView(ENUM_VIEW.NONE);

            for (var cMatchId in oData.responseJSON) {
                displayMatchlistMatchContainer(cContainerId, cMatchId, oData.responseJSON[cMatchId]);
            };

            setLoading(false);
            setView(ENUM_VIEW.MATCHLIST);
        },
        error: function (oXhr, cStatus, cError) {
            setMessage('<b>' + cStatus + '</b><br />' + cError, 'danger');
        }
    });
}

function displayMatchlistMatchContainer(cContainerId, cMatchId, oMatch) {
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

    $(cContainerId).append('<div id="' + cMatchId + '" class="list-group-item ' + cRegion.toLowerCase() + '"><div class="row"><div class="col-md-1"><div class="matchlist-eyecatcher"><span class="matchlist-region region-' + cRegion.toLowerCase() + '">' + cRegion + '</span><span class="matchlist-tier">Tier ' + cTier + '</span></div></div><div class="col-md-9"><a class="match-container" data-match-id="' + oMatch.id + '"></a></div><div class="col-md-2"><span class="matchlist-last-update pull-right" title="' + moment.utc(oMatch.last_update).local().format("HH:mm:ss") +
        '">updated ' + moment.utc(oMatch.last_update).local().fromNow() + '</span>' + cDebugInfo + '</div></div></div>');

    var cContainer = '<div class="matchlist-worldlist">';
    var cMatchStats = '';

    var aWorlds = new Array();
    aWorlds.push(oMatch.worlds.green);
    aWorlds.push(oMatch.worlds.blue);
    aWorlds.push(oMatch.worlds.red);

    for (var cWorldId in aWorlds) {
        var oWorld = aWorlds[cWorldId];
        var nKd = parseInt(oWorld.kills) / parseInt(oWorld.deaths);
        var cLabelKdrClass = nKd >= 1 ? "success" : (nKd.toFixed(2) == 1 ? "warning" : "danger");
        var nWidthLabels = oMatch.has_score_data ? 2 : 1;
        var nWidthWorlds = oMatch.has_score_data ? 7 : 8;


        cContainer += '<div class="row"><div class="col-md-' + nWidthLabels + ' matchlist-world-kd">';


        cContainer += '<span title="Kills: ' + oWorld.kills + ' / Deaths: ' + oWorld.deaths + '" class="label label-' + cLabelKdrClass + '">KD: ' + getKdr(oWorld.kills, oWorld.deaths) + '</span>';

        if (oMatch.has_score_data) {
            var nPpkTotal = (oMatch.ppk_value * oWorld.kills);
            var nPpkPercentage = nPpkTotal / oWorld.score * 100;

            var cLabelPpkClass = getClassForMatchlistPpkRanking(aWorlds, oWorld, oMatch);
            cContainer += '<span title="Total score: ' + oWorld.score.toThousandSeparator() + '" title="" class="label label-' + cLabelPpkClass + ' label-ppk-percentage">' + nPpkPercentage.toFixedLeading(2, 2) + '% PPK</span>';
        }

        var oWidths = getWidths(parseInt(oWorld.kills), parseInt(oWorld.deaths));

        cContainer += '</div><div class="col-md-3 matchlist-stat-container"><div class="progress"><div class="progress-bar kills total ' + oWorld.world_id + ' no-nightmode" title="kills" role="progressbar" style="width: ' + oWidths.kills + '; background-color: ' + shadeColor(colorNameToHex(oWorld.color), 0.3) + ';"  >' + oWorld.kills + '</div><div class="progress-bar ' + oWorld.world_id + ' total deaths no-nightmode" style="width: ' + oWidths.deaths + '; background-color: ' + shadeColor(colorNameToHex(oWorld.color), -0.3) + ';" title="deaths">' + oWorld.deaths + '</div></div></div><div class="col-md-' + nWidthWorlds + ' matchlist-world-container"><b><i class="famfamfam-flag-' + getFlagShort(oWorld.arenanet_id) + '"></i> ' + oWorld.name + '</b>';

        aSearchQuery.push(oWorld.name);

        if (oWorld.additional_worlds != null) {
            for (var cAdditionalWorldId in oWorld.additional_worlds) {
                cContainer += ', <i class="famfamfam-flag-' + getFlagShort(oWorld.additional_worlds[cAdditionalWorldId].arenanet_id) + '"></i> ' + oWorld.additional_worlds[cAdditionalWorldId].name;

                aSearchQuery.push(oWorld.additional_worlds[cAdditionalWorldId].name);
            }
        }

        cContainer += '</div></div>';
    }
    cContainer += "</a></div>";
    $("#" + cMatchId + ' a.match-container').append(cContainer);
    $("#" + cMatchId + ' div.matchlist-stat-container').append(cMatchStats);

    $('#' + cMatchId).attr('data-search-query', aSearchQuery.join('#'));

    $('#' + cMatchId + " a.match-container").click(function () {
        window.location = cUrl;
    });
}

function getClassForMatchlistPpkRanking(aWorlds, oWorld, oMatch) {
    var aSorted = aWorlds.slice(0).sort(function (a, b) {
        var nPpkTotalA = (oMatch.ppk_value * a.kills);
        var nPpkPercentageA = nPpkTotalA / a.score * 100;
        var nPpkTotalB = (oMatch.ppk_value * b.kills);
        var nPpkPercentageB = nPpkTotalB / b.score * 100;

        return nPpkPercentageB - nPpkPercentageA;
    });

    if (aSorted[0] == oWorld) {
        return "success";
    }
    if (aSorted[aSorted.length - 2] == oWorld) {
        return "warning";
    }
    if (aSorted[aSorted.length - 1] == oWorld) {
        return "danger";
    }
    return "default";
}

function getClassForWorldStatisticsPpkRanking(aWorlds, oWorld) {
    var aSorted = aWorlds.slice(0).sort(function (a, b) {

        var sumKillsA = 0;
        var sumScoreA = 0;
        var sumKillsB = 0;
        var sumScoreB = 0;

        for (var mapId in a.maps) {
            var map = a.maps[mapId];
            sumKillsA += map.kills;
            sumScoreA += map.score;
        }
        for (var mapId in b.maps) {
            var map = b.maps[mapId];
            sumKillsB += map.kills;
            sumScoreB += map.score;
        }

        var nPpkTotalA = (_CURRENT_MATCH.ppk_value * sumKillsA);
        var nPpkPercentageA = nPpkTotalA / sumScoreA * 100;
        var nPpkTotalB = (_CURRENT_MATCH.ppk_value * sumKillsB);
        var nPpkPercentageB = nPpkTotalB / sumScoreB * 100;

        return nPpkPercentageB - nPpkPercentageA;
    });

    if (aSorted[0].world_id == oWorld.world_id) {
        return "success";
    }
    if (aSorted[aSorted.length - 2].world_id == oWorld.world_id) {
        return "warning";
    }
    if (aSorted[aSorted.length - 1].world_id == oWorld.world_id) {
        return "danger";
    }
    return "default";
}

function getClassForMapPpkRanking(oMapList, oMap) {
    var aMaps = Object.values(oMapList);
    var aSorted = aMaps.slice(0).sort(function (a, b) {
        var nPpkTotalA = (_CURRENT_MATCH.ppk_value * a.kills);
        var nPpkPercentageA = nPpkTotalA / a.score * 100;
        var nPpkTotalB = (_CURRENT_MATCH.ppk_value * b.kills);
        var nPpkPercentageB = nPpkTotalB / b.score * 100;

        return nPpkPercentageB - nPpkPercentageA;
    });

    if (aSorted[0].map_id == oMap.map_id) {
        return "success";
    }
    if (aSorted[aSorted.length - 1].map_id == oMap.map_id) {
        return "danger";
    }
    return "default";
}


$('#modal-shortlink').on('shown.bs.modal', function (event) {
    var oSender = $(event.relatedTarget);
    var cMatchSlug = oSender.attr('data-match-slug');
    var cShortlink = window.location.href; //.split('#')[0] + "#/matches/" + cMatchSlug + "/";

    $('#shortlink-textbox').val(cShortlink);
    $('#shortlink-textbox').select();
})

$('.checkable > a').click(function () {
    var target = $(this).attr("data-target");
    var value = !($(this).attr("data-value") == 'true');

    _SETTINGS[target] = value;
    $(this).find('.glyphicon').css('opacity', value ? 1 : 0);

    $(this).attr("data-value", value);
    storeSettings();
    setSpecificMatch(_CURRENT_MATCH_ID);
});


function setMatch(cMatchId) {

    setView(ENUM_VIEW.NONE);
    setLoading(true);
    resetView();

    m_oHighchartsKills = new Highcharts.stockChart(getChartOptions());

    var cFlatteningOption =
        _SETTINGS["flattening"] ? "flattened" : "unaltered";
    var cSmoothingOption =
        _SETTINGS["smoothing"] ? "smoothed" : "unaltered";

    $.ajax({
        url: _API_BASE + "match/" + cMatchId + "/" + cFlatteningOption + "/" + cSmoothingOption + "?ts=" + $.now(),
        dataType: "json",
        complete: function (oData) {
            var oMatch = oData.responseJSON;
            var i = 0;
            var aWorlds = getWorlds(oMatch);
            var aMaps = getMaps(aWorlds);
            var nKillsMax = 0;
            var nDeathsMin = 0;

            _CURRENT_MATCH = oMatch;

            var cTier = oMatch.match_arenanet_id.split('-')[1];
            var cRegion = oMatch.match_arenanet_id.split('-')[0] == "1" ? "NA" : "EU";
            var cLongestSlug = getLongestInArray(oMatch.slugs);

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

            if (_SETTINGS.range_selection) {
                _CURRENT_SELECTED_RANGE.min = oMatch.match_start;
                _CURRENT_SELECTED_RANGE.max = oMatch.match_end;
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

            _CURRENT_MATCH_ID = cMatchId;

            if (oMatch.flattened || oMatch.smoothed) {
                setMessage("Due to the <strong>Guild Wars 2 API</strong>'s timing issues the data of this match has been flattened to be more precise.<br />Please note, that this has altered the timeline of when kills occured, while the kill and death counts remain correct. I know it's not pretty, but that's as much as i can do 🔥.", "warning");
            }

            //Statistik
            setStatisticsView(oMatch);
            initMatchStatistics(oMatch);
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
        timeslots: {},
        start: null,
        end: null
    };


    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        var cMapId = oSeries.map_id;
        var cWorldId = oSeries.world_arenanet_id;

        if (!_STATISTICS_VIEW.worlds[cWorldId]) {

            _STATISTICS_VIEW.worlds[cWorldId] = {
                world_name: oSeries.world_name,
                world_id: oSeries.world_arenanet_id,
                color: oSeries.color,
                maps: {}
            }
        }

        if (!_STATISTICS_VIEW.worlds[cWorldId].maps[cMapId]) {
            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId] = {
                map_id: oSeries.map_id,
                kills: 0,
                deaths: 0,
                score: 0
            }
        }

        for (var nSeriesItemIndex in oSeries.series_items) {
            var oSeriesItem = oSeries.series_items[nSeriesItemIndex];
            var cTimeslotId = oSeriesItem.timeslot_id.toString();

            if (_STATISTICS_VIEW.start == null) _STATISTICS_VIEW.start = oSeriesItem.timeslot_start;
            _STATISTICS_VIEW.end = oSeriesItem.timeslot_end;

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
                    world_id: oSeries.world_arenanet_id,
                    color: oSeries.color,
                    maps: {}
                }
            }

            if (!_STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId]) {
                _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId] = {
                    map_id: oSeries.map_id,
                    kills: 0,
                    deaths: 0,
                    score: 0
                }
            }

            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId].kills += parseInt(oSeriesItem.kills);
            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId].deaths += parseInt(oSeriesItem.deaths);
            _STATISTICS_VIEW.worlds[cWorldId].maps[cMapId].score += parseInt(oSeriesItem.score_gain);
            _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId].kills += parseInt(oSeriesItem.kills);
            _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId].deaths += parseInt(oSeriesItem.deaths);
            _STATISTICS_VIEW.timeslots[cTimeslotId].worlds[cWorldId].maps[cMapId].score += parseInt(oSeriesItem.score_gain);
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
    setSpecificMatch(_CURRENT_MATCH_ID);
});


function setSeries(oSeries, aWorlds, aMaps, i, cDeathsKills) {
    var bDeaths = cDeathsKills == "Deaths";
    m_oHighchartsKills.addSeries({
        name: '[' + cDeathsKills + '] ' + oSeries.world_name + ' on ' + aMaps[oSeries.map_id],
        yAxis: bDeaths ? 0 : 1,
        animation: false,
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
            world: oSeries.world_arenanet_id,
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

function initMatchStatistics(oMatch) {
    var cContainerId = '#match-statistics-container';
    var aWorlds = new Array();
    var aWorldClasses = getMapClasses();
    var nWidthKillsDeaths = oMatch.has_score_data ? 6 : 8;
    var nWidthInfo = oMatch.has_score_data ? 4 : 2;
    var cHasScoreData = oMatch.has_score_data ? " has-score-data" : "";

    $(cContainerId).html('');

    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        var cKey = oSeries.world_arenanet_id; // + '_' + oSeries.color;
        if (typeof aWorlds[cKey] === 'undefined') {
            aWorlds[cKey] = {
                world_id: oSeries.world_arenanet_id,
                color: oSeries.color,
                world_name: oSeries.world_name,
                maps: new Array()
            };
        }
        aWorlds[cKey].maps[oSeries.map_id] = {
            map_id: oSeries.map_id
        };
    }


    var cContainerContent = '<div class="row' + cHasScoreData + '">';
    for (var cWorldKey in aWorlds) {
        oWorld = aWorlds[cWorldKey];
        cContainerContent += '<div class="col-md-4 world-container ' + oWorld.world_id + '" data-world-name="' + oWorld.world_name + '">';
        cContainerContent += '<div class="row"><div class="col-md-9"><h4>' + oWorld.world_name + '</h4><span class="copy-statistics copy-' + oWorld.world_id + '" title="Copy statistics to clipboard"><i class="glyphicon glyphicon-copy"></i></span></div><div class="col-md-3"><h4 class=" world-kd ' + oWorld.world_id + '"></h4></div></div><h6>';

        var i = 0;
        for (var cAddtionalWorldKey in oMatch.worlds[oWorld.color].additional_worlds) {
            i++;
            cContainerContent += oMatch.worlds[oWorld.color].additional_worlds[cAddtionalWorldKey].name;
            if (i < Object.keys(oMatch.worlds[oWorld.color].additional_worlds).length) {
                cContainerContent += ", ";
            }
        }
        cContainerContent += "&nbsp;</h6>"

        for (var cMapId in oWorld.maps) {
            var oMap = oWorld.maps[cMapId];
            var cMapName = oMap.map_id == "38" ? "EBG" : "Border";



            cContainerContent += '<div class="row kd" data-world="' + oWorld.world_id + '" data-map-id="' + cMapId + '" data-color="' + aWorldClasses[oMap.map_id] + '" data-world-name="' + oWorld.world_name + '" data-map-name="' + cMapName + '">';

            cContainerContent += '<div class="col-md-2 col-map-name map-name-' + aWorldClasses[oMap.map_id] + '">' + cMapName + '</div><div class="col-md-' + nWidthKillsDeaths + ' col-world-kills"><div class="progress"><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' kills no-nightmode" title="kills" role="progressbar" style="width: 50%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, false) + ';"  ></div><div class="progress-bar ' + cMapId + ' ' + oWorld.world_id + ' deaths no-nightmode" style="width: 50%; background-color: ' + getMapChartColor(oWorld.color, oMap.map_id, true) + ';" title="deaths"></div></div></div><div class="col-md-' + nWidthInfo + ' ' + cMapId + ' ' + oWorld.world_id + ' ' + cHasScoreData + ' kdr col-kdr"></div></div>';
        }

        cContainerContent += '<div class="row kd-total" data-world="' + oWorld.world_id + '"><div class="col-md-2 col-world-name"><strong>Total</strong></div><div class="col-md-' + nWidthKillsDeaths + ' col-world-kills"><div class="progress"><div class="progress-bar kills total ' + oWorld.world_id + '  no-nightmode" title="kills" role="progressbar" style="width: 50%; background-color: ' + shadeColor(colorNameToHex(oWorld.color), 0.3) + ';"  ></div><div class="progress-bar ' + oWorld.world_id + ' total deaths no-nightmode" style="width: 50%; background-color: ' + shadeColor(colorNameToHex(oWorld.color), -0.3) + ';" title="deaths"></div></div></div><div class="col-md-' + nWidthInfo + ' col-kdr' + cHasScoreData + '"><strong><span class="kdr total ' + oWorld.world_id + ' "></span></strong></div></div>';

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

        $('.copy-' + aWorlds[cWorldKey].world_id).attr('data-clipboard-text', getClipboard(oMatch, aWorlds[cWorldKey].world_id, null));
        new Clipboard('.copy-' + aWorlds[cWorldKey].world_id);
    }
}

function setStatistics(nTimeslotId) {
    $('#match-current-range-selection').addClass('hidden');
    if (nTimeslotId == -1) {
        //No timeslot selected

        if (_SETTINGS.range_selection) {
            var oStats = getStatisticsContainerForTimeRange(_CURRENT_MATCH);
            $('#match-current-range-selection').removeClass('hidden');
            $('#match-current-range-selection').text('Current Selection: ' + moment.utc(oStats.start).local().format('YYYY.MM.DD HH:mm') + ' to ' + moment.utc(oStats.end).local().format('YYYY.MM.DD HH:mm') + '')

            for (var nWorldId in oStats.worlds) {
                var oWorld = oStats.worlds[nWorldId];
                setStatisticForWorld(oWorld, oStats.worlds);
            }

        } else {
            for (var nWorldId in _STATISTICS_VIEW.worlds) {
                var oWorld = _STATISTICS_VIEW.worlds[nWorldId];
                setStatisticForWorld(oWorld, _STATISTICS_VIEW.worlds);
            }
        }

        for (var nWorldId in _STATISTICS_VIEW.worlds) {
            var oWorld = _STATISTICS_VIEW.worlds[nWorldId];

            $('.copy-' + oWorld.world_id).attr('data-clipboard-text', getClipboard(_CURRENT_MATCH, oWorld.world_id, null));
            new Clipboard('.copy-' + oWorld.world_id);
        }
    } else {
        //Timeslot
        for (var nWorldId in _STATISTICS_VIEW.timeslots[nTimeslotId].worlds) {
            var oWorld = _STATISTICS_VIEW.timeslots[nTimeslotId].worlds[nWorldId];
            setStatisticForWorld(oWorld, _STATISTICS_VIEW.timeslots[nTimeslotId].worlds);
        }
    }

}

function getStatisticsContainerForTimeRange(oMatch) {

    var oRetStats = {
        worlds: {},
        start: null,
        end: null
    }

    for (var cSeriesKey in oMatch.series) {
        var oSeries = oMatch.series[cSeriesKey];
        var cMapId = oSeries.map_id;
        var cWorldId = oSeries.world_arenanet_id;

        if (!oRetStats.worlds[cWorldId]) {
            oRetStats.worlds[cWorldId] = {
                world_name: oSeries.world_name,
                world_id: oSeries.world_arenanet_id,
                color: oSeries.color,
                maps: {}
            }
        }

        if (!oRetStats.worlds[cWorldId].maps[cMapId]) {
            oRetStats.worlds[cWorldId].maps[cMapId] = {
                map_id: oSeries.map_id,
                kills: 0,
                deaths: 0,
                score: 0
            }
        }

        for (var nSeriesItemIndex in oSeries.series_items) {

            var oSeriesItem = oSeries.series_items[nSeriesItemIndex];
            var oStartUTC = Date.UTC(oSeriesItem.timeslot_start);
            var oSstartUTC = Date.UTC(oSeriesItem.timeslot_end);

            if (moment(_CURRENT_SELECTED_RANGE.min).isSameOrBefore(moment.utc(oSeriesItem.timeslot_start)) &&
                moment(_CURRENT_SELECTED_RANGE.max).isSameOrAfter(moment.utc(oSeriesItem.timeslot_start))) {

                if (oRetStats.start == null) oRetStats.start = oSeriesItem.timeslot_start;
                oRetStats.end = oSeriesItem.timeslot_end;

                oRetStats.worlds[cWorldId].maps[cMapId].kills += parseInt(oSeriesItem.kills);
                oRetStats.worlds[cWorldId].maps[cMapId].deaths += parseInt(oSeriesItem.deaths);
                oRetStats.worlds[cWorldId].maps[cMapId].score += parseInt(oSeriesItem.score_gain);
            }
        }
    }

    return oRetStats;
}

function setStatisticForWorld(oWorld, oContext) {
    var nSumKills = 0;
    var nSumDeaths = 0;
    var nSumScore = 0;


    for (var nMapId in oWorld.maps) {
        var oMap = oWorld.maps[nMapId];
        var oWidths = getWidths(oMap.kills, oMap.deaths);

        var nKd = parseInt(oMap.kills) / parseInt(oMap.deaths);
        var cLabelKdrClass = nKd >= 1 ? "success" : (nKd.toFixed(2) == 1 ? "warning" : "danger");

        $('.progress-bar.' + oWorld.world_id + '.' + oMap.map_id + ".kills").css("width", oWidths.kills).text(oMap.kills);
        $('.progress-bar.' + oWorld.world_id + '.' + oMap.map_id + ".deaths").css("width", oWidths.deaths).text(oMap.deaths);
        $('.kdr.' + oWorld.world_id + '.' + oMap.map_id).html('<span class="label label-' + cLabelKdrClass + '">&empty; ' + getKdr(oMap.kills, oMap.deaths) + '</span>');

        if (_CURRENT_MATCH.has_score_data) {

            var nPpkTotal = (_CURRENT_MATCH.ppk_value * oMap.kills);
            var nPpkPercentage = oMap.score > 0 ? (nPpkTotal / oMap.score * 100) : 0;

            var cLabelPpkClass = getClassForMapPpkRanking(oWorld.maps, oMap);
            $('.kdr.' + oWorld.world_id + '.' + oMap.map_id).append('<span title="Total score: ' + oMap.score.toThousandSeparator() + '" class="label-ppk-percentage label label-' + cLabelPpkClass + ' label-ppk-percentage">' + nPpkPercentage.toFixedLeading(2, 2) + '% PPK</span>');
        }

        nSumKills += oMap.kills;
        nSumDeaths += oMap.deaths;
        nSumScore += oMap.score;
    }

    var oTotalWidths = getWidths(nSumKills, nSumDeaths);

    var nKd = nSumKills / nSumDeaths;
    var cLabelKdrClass = nKd >= 1 ? "success" : (nKd.toFixed(2) == 1 ? "warning" : "danger");


    $('.progress-bar.' + oWorld.world_id + '.total.kills').css("width", oTotalWidths.kills).text(nSumKills);
    $('.progress-bar.' + oWorld.world_id + '.total.deaths').css("width", oTotalWidths.deaths).text(nSumDeaths);
    $('.world-kd.' + oWorld.world_id).html("&empty;" + getKdr(nSumKills, nSumDeaths));
    $('.kdr.total.' + oWorld.world_id).html('<span class="label label-' + cLabelKdrClass + '">&empty; ' + getKdr(nSumKills, nSumDeaths) + '</span>');

    if (_CURRENT_MATCH.has_score_data) {

        var nPpkTotal = (_CURRENT_MATCH.ppk_value * nSumKills);
        var nPpkPercentage = nSumScore > 0 ? (nPpkTotal / nSumScore * 100) : 0;

        var cLabelPpkClass = getClassForWorldStatisticsPpkRanking(Object.values(oContext), oWorld);
        $('.kdr.total.' + oWorld.world_id).append('<span title="Total score: ' + nSumScore.toThousandSeparator() + '" class="label-ppk-percentage label label-' + cLabelPpkClass + ' label-ppk-percentage">' + nPpkPercentage.toFixedLeading(2, 2) + '% PPK</span>');
    }


}

function getClipboard(oMatch, nWorldId, nTimeslotId) {
    var oWorld = _STATISTICS_VIEW.worlds[nWorldId];
    var selectedRange = null;
    var cTimestamp = "";

    if (nTimeslotId != undefined && nTimeslotId) {
        oWorld = _STATISTICS_VIEW.timeslots[nTimeslotId].worlds[nWorldId];

        cTimestamp = " (" + moment.utc(_STATISTICS_VIEW.timeslots[nTimeslotId].timeslot_start).local().format('HH:mm') + '-' + moment.utc(_STATISTICS_VIEW.timeslots[nTimeslotId].timeslot_end).local().format('HH:mm') + ")";
    } else if (_SETTINGS.range_selection) {
        selectedRange = getStatisticsContainerForTimeRange(oMatch);

        cTimestamp = " (" + moment.utc(selectedRange.start).local().format('YYYY.MM.DD HH:mm') + '-' + moment.utc(selectedRange.end).local().format('YYYY.MM.DD HH:mm') + ")";

        oWorld = selectedRange.worlds[nWorldId];
    }


    var nFullDeaths = 0;
    var nFullKills = 0;
    var nFullScore = 0;
    var aWorldClasses = getMapClasses();
    var aMaps = new Array();

    for (var nMapId in oWorld.maps) {
        var oMap = oWorld.maps[nMapId];
        var nKills = parseInt(oMap.kills);
        var nDeaths = parseInt(oMap.deaths);

        var cMap = oMap.map_id == "38" ? "EBG" : "";
        var cColor = aWorldClasses[oMap.map_id];

        nFullDeaths += nDeaths;
        nFullKills += nKills;
        nFullScore += oMap.score;

        var cPpkAddition = "";
        if (_CURRENT_MATCH.has_score_data) {
            var nPpk = oMap.score > 0 ? ((oMap.kills * _CURRENT_MATCH.ppk_value) / oMap.score * 100) : 0;
            cPpkAddition += ', ' + nPpk.toFixed(0) + '%';
        }

        var cOutput = getKdr(nKills, nDeaths) + ' kd (' + nKills + '/' + nDeaths + cPpkAddition + ') @ ';
        if (cColor != "ebg") {
            cOutput += cColor.toProperCase();
        }
        cOutput += cMap;

        aMaps.push(cOutput);
    }


    var cPpkAddition = "";
    if (_CURRENT_MATCH.has_score_data) {
        var nPpk = nFullScore > 0 ? ((nFullKills * _CURRENT_MATCH.ppk_value) / nFullScore * 100) : 0;
        cPpkAddition += ', ' + nPpk.toFixed(0) + '% PPK';
    }


    var cWorldOverall = oWorld.world_name.split('[')[0].trim() + cTimestamp + ": " + getKdr(nFullKills, nFullDeaths) + ' kd (' + nFullKills + '/' + nFullDeaths + cPpkAddition + ') | ';



    return trimClipboard(cWorldOverall + aMaps.join(' | ') + ' - ' + moment.utc(oMatch.last_update).local().fromNow());
}

function trimClipboard(text) {
    const MAX_LENGTH = 199;

    if (text.length > MAX_LENGTH) {
        text = text.replace('@ Green', '@GBL');
        text = text.replace('@ Red', '@RBL');
        text = text.replace('@ Blue', '@GBL');
        text = text.replace('@ EBG', '@EB');
    }
    if (text.length > MAX_LENGTH) {
        text = text.replace(' - a minute ago', ' - now');
        text = text.replace(' - a few seconds ago', ' - now');
        text = text.replace(' minutes ago', ' min. ago');
    }

    if (text.length > MAX_LENGTH) {
        text = text.replace("Blackgate", "BG");
        text = text.replace("Jade Quarry", "JQ");
        text = text.replace("Sanctum of Rall", "SoR");
        text = text.replace("Ehmry Bay", "Eh.B");
        text = text.replace("Stormbluff Isle", "SbI");
        text = text.replace("Borlis Pass", "Bor.Pa.");
        text = text.replace("Tarnished Coast", "Tar.Co.");
        text = text.replace("Crystal Desert", "Cr.Des.");
        text = text.replace("Dragonbrand", "Drag.Br.");
        text = text.replace("Darkhaven", "Da.Hav.");
        text = text.replace("Maguuma", "Mag.");
        text = text.replace("Isle of Janthir", "Isl.o.Ja.");
        text = text.replace("Sea of Sorrows", "SoS");
        text = text.replace("Devona's Rest", "Dev.R");
        text = text.replace("Fort Aspenwood", "FA");
        text = text.replace("Northern Shiverpeaks", "NSP");
        text = text.replace("Sorrow's Furnace", "SF");
        text = text.replace("Henge of Denravi", "HoD");
        text = text.replace("Yak's Bend", "YB");
        text = text.replace("Anvil Rock", "AR");
        text = text.replace("Gate of Madness", "GoM");
        text = text.replace("Desolation", "Deso");
        text = text.replace("Arborstone", "Arb.St.");
        text = text.replace("Far Shiverpeaks", "FSP");
        text = text.replace("Ring of Fire", "RoF");
        text = text.replace("Gunnar's Hold", "GH");
        text = text.replace("Fissure of Woe", "FoW");
        text = text.replace("Aurora Glade", "AG");
        text = text.replace("Fort Ranik", "FR");
        text = text.replace("Baruch Bay", "BB");
        text = text.replace("Underworld", "UW");
        text = text.replace("Drakkar Lake", "Drakkar");
        text = text.replace("Piken Square", "Piken");
        text = text.replace("Blacktide", "BT");
        text = text.replace("Seafarer's Rest", "SFR");
        text = text.replace("Abaddon's Mouth", "Aba");
        text = text.replace("Riverside", "RS");
        text = text.replace("Elona Reach", "Elona");
        text = text.replace("Miller's Sound", "Miller");
        text = text.replace("Jade Sea", "JS");
        text = text.replace("Vizunah Square", "Vizu");
        text = text.replace("Whiteside Ridge", "WSR");
        text = text.replace("Augury Rock", "AR");
        text = text.replace("Ruins of Surmia", "RoS");
        text = text.replace("Dzagonur", "Dzago");

    }
    if (text.length > MAX_LENGTH) {
        text = text.replaceAll(' kd ', '');
        text = text.replaceAll('% PPK', '%PPK');
    }
    if (text.length > MAX_LENGTH) {
        text = text.replaceAll(" @", "@");
        text = text.replaceAll(" |", "|");
    }

    return text.trim();
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
    _CURRENT_MATCH = null;
}

function getFlagShort(nWorldId) {
    var cLeft2 = nWorldId.toString().substring(0, 2);
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

    var renderContainer = 'main-chart-container';

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });
    var oChartOptions = {
        chart: {
            backgroundColor: 'transparent',
            renderTo: renderContainer,
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
            //range: 24 * 60 * 60 * 1000,
            labels: {
                align: 'left',
                formatter: function () {
                    var oCorrectedDate = moment.utc(this.value).add(15, 'minutes').local().format("HH:mm");
                    return oCorrectedDate;
                }
            },
            events: {
                setExtremes: function (event) {
                    _CURRENT_SELECTED_RANGE.min = new Date(event.min);
                    _CURRENT_SELECTED_RANGE.max = new Date(event.max);
                    setStatistics(-1);
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
            series: {
                animation: false
            },
            area: {
                stacking: 'normal',
                animation: false,
                marker: {
                    // width: 10,
                    // height: 10
                },
                point: {
                    events: {
                        click: function () {
                            setCopyModal(this.timeslot_id);
                        }
                    }
                }
            }
        },
        series: []
    }
    return oChartOptions;
}

function setCopyModal(cTimeslotId) {
    $('#copy-timeslot-green').attr('data-timeslot-id', cTimeslotId);
    $('#copy-timeslot-blue').attr('data-timeslot-id', cTimeslotId);
    $('#copy-timeslot-red').attr('data-timeslot-id', cTimeslotId);

    $('#copy-timeslot-green-name').text(_WORLDS['green'].name);
    $('#copy-timeslot-green').attr('data-world-id', _WORLDS['green'].id);

    $('#copy-timeslot-blue-name').text(_WORLDS['blue'].name);
    $('#copy-timeslot-blue').attr('data-world-id', _WORLDS['blue'].id);

    $('#copy-timeslot-red-name').text(_WORLDS['red'].name);
    $('#copy-timeslot-red').attr('data-world-id', _WORLDS['red'].id);

    $('#copy-timeslot').css('top', _CURSOR.y).css('left', _CURSOR.x - 30);

    var oTimeslot = _STATISTICS_VIEW.timeslots[cTimeslotId];
    $('#copy-timeslot-header').html(moment.utc(oTimeslot.timeslot_start).local().format('HH:mm') + '-' + moment.utc(oTimeslot.timeslot_end).local().format('HH:mm'));

    new Clipboard('#copy-timeslot-red');
    new Clipboard('#copy-timeslot-green');
    new Clipboard('#copy-timeslot-blue');
    $('#copy-timeslot').removeClass('hidden');
}

$('.copy-timeslot').click(function () {
    var nTimeslotId = $(this).attr('data-timeslot-id');
    var nWorldId = $(this).attr('data-world-id');
    $(this).attr('data-clipboard-text', getClipboard(_CURRENT_MATCH, nWorldId, nTimeslotId));
    $('#copy-timeslot').addClass('hidden');
});

$('#copy-timeslot-cancel').click(function () {
    $('#copy-timeslot').addClass('hidden');
    new Clipboard(this);
});

$('body').click(function () {
    $('#copy-timeslot').addClass('hidden');
});

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
        case 34:
            nShade = 0.09;
            break;
        case 95:
            nShade = 0.15;
            break;
        case 96:
            nShade = 0.3;
            break;
        case 1099:
        case 97:
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

$(document).on("mousemove", function (event) {
    _CURSOR = {
        x: event.pageX,
        y: event.pageY
    };
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

function cmpColor(a, b) {
    if (a.color == "red") return 3;
    if (a.color == "blue") return 2;
    return 1;
}

String.prototype.toProperCase = function () {
    return this.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

Number.prototype.toFixedLeading = function (leadingZeroes, fractionDigits) {
    var leading = new Array(leadingZeroes + 1).join('0');
    return (leading + this.toFixed(fractionDigits)).slice((leadingZeroes + fractionDigits + 1) * -1);
}

Number.prototype.toThousandSeparator = function () {
    return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

String.prototype.replaceAll = function (find, replacement) {
    var txt = this;
    while (txt.includes(find))
        txt = txt.replace(find, replacement);

    return txt;
}