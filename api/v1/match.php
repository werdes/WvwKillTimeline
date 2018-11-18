<?php

require_once("class/series.class.php");
require_once("class/series_item.class.php");
require_once("class/match.class.php");


define("THRESHOLD_FLATTENING", 17);
define("THRESHOLD_VICTIM", 0.3);
define("THRESHOLD_BACKTRACKING_COUNT", 7);

if (isset($_ID) && !empty($_ID) && isset($_FLATTEN)) {
    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

    $oMatch = new match();
    $oMatch->series = array();
    $oMatch->flattening_requested = $_FLATTEN;

    $aWorlds = array();

    if (!$oConnection->connect_errno) {

        $nMicrotimeBeforeQuery = microtime(true);

            //Match
        $cMatchDbStatement = "SELECT * FROM `match` where id = " . $oConnection->real_escape_string($_ID) . ";";
        $oMatchDbQuery = $oConnection->query($cMatchDbStatement);
        $oMatchDb = $oMatchDbQuery->fetch_object();

        if ($oMatchDb != null) {

            $oMatch->match_id = $oMatchDb->arenanet_id;
            $oMatch->match_start = $oMatchDb->start_time;
            $oMatch->match_end = $oMatchDb->end_time;
            $oMatch->flattened = false;
            $oMatch->last_update = $oMatchDb->last_update;

            $cWorldsStatement = "SELECT * FROM world;";
            $oWorldsQuery = $oConnection->query($cWorldsStatement);
            while ($oRowWorld = $oWorldsQuery->fetch_object()) {
                $aWorlds[$oRowWorld->id] = $oRowWorld;
            }

                // $cSqlStatement = "SELECT timeslot_kills.map_id, timeslot_kills.kills, timeslot_kills.deaths, match_worlds.color, `match`.arenanet_id as match_id, `match`.start_time AS match_start, `match`.end_time AS match_end, world.arenanet_id AS world_id, world.name as world_name, timeslot.start_time AS timeslot_start, timeslot.end_time AS timeslot_end, timeslot.`errors` as timeslot_errors FROM timeslot_kills INNER JOIN timeslot ON timeslot_kills.timeslot_id = timeslot.id INNER JOIN match_worlds ON timeslot_kills.match_worlds_id = match_worlds.id INNER JOIN world ON match_worlds.world_id = world.id INNER JOIN `match` ON match_worlds.match_id = `match`.id WHERE `match`.id = " . $oConnection->real_escape_string($_GET["match_id"]) . " AND ((100 / (timeslot.`errors` + timeslot.successes) * timeslot.`errors` < 10) or(timeslot.`errors` = 0 and timeslot.successes = 0))   ORDER BY timeslot.id ASC, match_worlds.color ASC, timeslot_kills.map_id ASC";

            $cSqlStatement = "SELECT 
                        timeslot_kills.map_id, timeslot_kills.kills, timeslot_kills.deaths, match_worlds.color, match_worlds.world_id, 
                        timeslot.start_time AS timeslot_start, timeslot.end_time AS timeslot_end, 
                        timeslot.`errors` AS timeslot_errors,
                        timeslot.id as timeslot_id
                    FROM timeslot_kills
                    INNER JOIN timeslot ON timeslot_kills.timeslot_id = timeslot.id
                    INNER JOIN match_worlds ON timeslot_kills.match_worlds_id = match_worlds.id
                    WHERE match_worlds.match_id = " . $oMatchDb->id . " 
                    ORDER BY timeslot.id ASC, match_worlds.color ASC, timeslot_kills.map_id ASC";

            $oSqlQuery = $oConnection->query($cSqlStatement);

            if (!$oSqlQuery) {
                die($oConnection->error);
            }
            $nMicrotimeAfterQuery = microtime(true);

            while ($oItem = $oSqlQuery->fetch_object()) {

                $oWorld = $aWorlds[$oItem->world_id];
                    // print_r($oWorld);

                $cKey = $oItem->map_id . "_" . $oWorld->arenanet_id;
                if (!array_key_exists($cKey, $oMatch->series)) {
                    $oSeries = new series();
                    $oSeries->world_id = $oWorld->arenanet_id;
                    $oSeries->world_name = $oWorld->name;
                    $oSeries->map_id = $oItem->map_id;
                    $oSeries->color = $oItem->color;
                    $oSeries->series_items = array();

                    $oMatch->series[$cKey] = $oSeries;
                }

                $oSeriesItem = new series_item();
                $oSeriesItem->timeslot_start = $oItem->timeslot_start;
                $oSeriesItem->timeslot_end = $oItem->timeslot_end;
                $oSeriesItem->kills = intval($oItem->kills) >= 0 ? intval($oItem->kills) : 0;
                $oSeriesItem->deaths = intval($oItem->deaths) >= 0 ? intval($oItem->deaths) : 0;
                $oSeriesItem->error = false;
                $oSeriesItem->timeslot_id = $oItem->timeslot_id;

                array_push($oMatch->series[$cKey]->series_items, $oSeriesItem);
            }

        }

        $nMicrotimeAfterLoop = microtime(true);



            //Flattening spikes
        if (FLATTEN_STATISTICS && $_FLATTEN) {
            foreach ($oMatch->series as $oSeries) {
                for ($i = 0; $i < count($oSeries->series_items); $i++) {
                    $oSeriesItem = $oSeries->series_items[$i];
                    if ($oSeriesItem->kills > THRESHOLD_FLATTENING || $oSeriesItem->deaths > THRESHOLD_FLATTENING) {
                        //Eligible for flattening into earlier tiers

                        $nCountPrecedingNullElements = 0;

                        $nSumKills = $oSeriesItem->kills;
                        $nSumDeaths = $oSeriesItem->deaths;

                        $j = $i - 1;
                        $nCountFlattened = 1;
                        while ($j > 0 && $oSeries->series_items[$j]->deaths <= $oSeriesItem->deaths * THRESHOLD_VICTIM && $oSeries->series_items[$j]->kills <= $oSeriesItem->kills * THRESHOLD_VICTIM && $nCountFlattened <= THRESHOLD_BACKTRACKING_COUNT) {

                            $nSumKills += $oSeries->series_items[$j]->kills;
                            $nSumDeaths += $oSeries->series_items[$j]->deaths;
                            $j--;
                            $nCountFlattened++;
                        }

                        if ($j > 0 && $nCountFlattened > 0 && ($oSeries->series_items[$j]->deaths < $oSeriesItem->deaths * THRESHOLD_VICTIM || $oSeries->series_items[$j]->kills < $oSeriesItem->kills * THRESHOLD_VICTIM)) {
                            //Preceding item is too small to be correct -> flatten as well

                            $nSumKills += $oSeries->series_items[$j]->kills;
                            $nSumDeaths += $oSeries->series_items[$j]->deaths;
                            $j--;
                            $nCountFlattened++;
                        }

                        if ($nCountFlattened > 1 && $j >= 0) {
                            $nNewValueKills = ceil($nSumKills / ($nCountFlattened));
                            $nNewValueDeaths = ceil($nSumDeaths / ($nCountFlattened));

                            $aNewValuesKills = array();
                            $aNewValuesDeaths = array();
                            for ($k = $j + 1; $k <= $i; $k++) {
                                if ($nSumKills >= $nNewValueKills) {
                                    $aNewValuesKills[$k] = $nNewValueKills;
                                    $nSumKills -= $nNewValueKills;
                                } else {
                                    $aNewValuesKills[$k] = $nSumKills;
                                    $nSumKills = 0;
                                }

                                if ($nSumDeaths >= $nNewValueDeaths) {
                                    $aNewValuesDeaths[$k] = $nNewValueDeaths;
                                    $nSumDeaths -= $nNewValueDeaths;
                                } else {
                                    $aNewValuesDeaths[$k] = $nSumDeaths;
                                    $nSumDeaths = 0;
                                }
                            }

                            if ($j > 0 && $i < count($oSeries->series_items) - 1) {
                                $nPrevValueKills = $oSeries->series_items[$j - 1]->kills;
                                $nNextValueKills = $aNewValuesKills[$i];
                                $nPrevValueDeaths = $oSeries->series_items[$j - 1]->deaths;
                                $nNextValueDeaths = $aNewValuesDeaths[$i];

                                $nDifferenceFirstLastKills = $nNextValueKills - $nPrevValueKills;
                                $nStepKills = floor($nDifferenceFirstLastKills / $nCountFlattened);
                                $nDifferenceFirstLastDeaths = $nNextValueDeaths - $nPrevValueDeaths;
                                $nStepDeaths = floor($nDifferenceFirstLastDeaths / $nCountFlattened);

                                $j2 = $j;
                                $i2 = $i;
                                while ($j2 < $i2) {
                                    if ($aNewValuesKills[$i2] + $nStepKills > 0 && $aNewValuesKills[$j2 + 1] - $nStepKills > 0) {
                                        $aNewValuesKills[$i2] += $nStepKills;
                                        $aNewValuesKills[$j2 + 1] -= $nStepKills;
                                    }
                                    if ($aNewValuesDeaths[$i2] + $nStepDeaths > 0 && $aNewValuesDeaths[$j2 + 1] - $nStepDeaths > 0) {
                                        $aNewValuesDeaths[$i2] += $nStepDeaths;
                                        $aNewValuesDeaths[$j2 + 1] -= $nStepDeaths;
                                    }
                                    $j2++;
                                    $i2--;
                                }


                            }



                            for ($k = $j + 1; $k <= $i; $k++) {
                                $oSeries->series_items[$k]->kills = $aNewValuesKills[$k];
                                $oSeries->series_items[$k]->deaths = $aNewValuesDeaths[$k];
                                $oSeries->series_items[$k]->flattened = true;
                            }

                            $oMatch->flattened = true;

                        }
                    }
                }
            }
        }

        $nMicrotimeAfterFlattening = microtime(true);
        echo json_encode($oMatch);

            // echo " Before Query : " . $nMicrotimeBeforeQuery . " <br />";
            // echo " After Query : " . $nMicrotimeAfterQuery . " <br />";
            // echo " After Loop : " . $nMicrotimeAfterLoop . " <br /><br />";
            // echo " Query time : " . ($nMicrotimeAfterQuery - $nMicrotimeBeforeQuery) . " <br />";
            // echo " Loop time : " . ($nMicrotimeAfterLoop - $nMicrotimeAfterQuery) . " <br />";
            // echo " Flattening time : " . ($nMicrotimeAfterFlattening - $nMicrotimeAfterQuery);



    }
}



?>