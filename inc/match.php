<?php
// error_reporting(0);
error_reporting(E_ALL);
// header('Content-Type: application/json');
require_once("config.inc.php");
require_once("../class/series.class.php");
require_once("../class/series_item.class.php");
require_once("../class/match.class.php");

define("THRESHOLD_FLATTENING", 25);
define("THRESHOLD_VICTIM", 0.2);
define("THRESHOLD_BACKTRACKING_COUNT", 4);


if (defined("DB_HOST") && defined("DB_USER") && defined("DB_PASSWORD") && defined("DB_NAME")) {
    if (isset($_GET["match_id"]) && !empty($_GET["match_id"])) {
        $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

        $oMatch = new match();
        $oMatch->series = array();

        $aWorlds = array();

        if (!$oConnection->connect_errno) {

            $nMicrotimeBeforeQuery = microtime(true);

            //Match
            $cMatchDbStatement = "SELECT * FROM `match` where id = " . $oConnection->real_escape_string($_GET["match_id"]) . ";";
            $oMatchDbQuery = $oConnection->query($cMatchDbStatement);
            $oMatchDb = $oMatchDbQuery->fetch_object();

            if ($oMatchDb != null) {

                $oMatch->match_id = $oMatchDb->arenanet_id;
                $oMatch->match_start = $oMatchDb->start_time;
                $oMatch->match_end = $oMatchDb->end_time;
                $oMatch->flattened = false;

                $cWorldsStatement = "SELECT * FROM world;";
                $oWorldsQuery = $oConnection->query($cWorldsStatement);
                while ($oRowWorld = $oWorldsQuery->fetch_object()) {
                    $aWorlds[$oRowWorld->id] = $oRowWorld;
                }

                // $cSqlStatement = "SELECT timeslot_kills.map_id, timeslot_kills.kills, timeslot_kills.deaths, match_worlds.color, `match`.arenanet_id as match_id, `match`.start_time AS match_start, `match`.end_time AS match_end, world.arenanet_id AS world_id, world.name as world_name, timeslot.start_time AS timeslot_start, timeslot.end_time AS timeslot_end, timeslot.`errors` as timeslot_errors FROM timeslot_kills INNER JOIN timeslot ON timeslot_kills.timeslot_id = timeslot.id INNER JOIN match_worlds ON timeslot_kills.match_worlds_id = match_worlds.id INNER JOIN world ON match_worlds.world_id = world.id INNER JOIN `match` ON match_worlds.match_id = `match`.id WHERE `match`.id = " . $oConnection->real_escape_string($_GET["match_id"]) . " AND ((100 / (timeslot.`errors` + timeslot.successes) * timeslot.`errors` < 10) or(timeslot.`errors` = 0 and timeslot.successes = 0))   ORDER BY timeslot.id ASC, match_worlds.color ASC, timeslot_kills.map_id ASC";

                $cSqlStatement = "SELECT 
                        timeslot_kills.map_id, timeslot_kills.kills, timeslot_kills.deaths, match_worlds.color, match_worlds.world_id, 
                        timeslot.start_time AS timeslot_start, timeslot.end_time AS timeslot_end, timeslot.`errors` AS timeslot_errors
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
                    $oSeriesItem->kills = $oItem->kills;
                    $oSeriesItem->deaths = $oItem->deaths;
                    $oSeriesItem->error = false;

                    array_push($oMatch->series[$cKey]->series_items, $oSeriesItem);
                }

            }

            $nMicrotimeAfterLoop = microtime(true);

            //Flattening spikes

            foreach ($oMatch->series as $oSeries) {
                for ($i = 0; $i < count($oSeries->series_items); $i++) {
                    $oSeriesItem = $oSeries->series_items[$i];
                    if ($oSeriesItem->kills > THRESHOLD_FLATTENING || $oSeriesItem->deaths > THRESHOLD_FLATTENING) {
                        //Eligible for flattening into earlier tiers

                        // $oLastSeriesItem = $oSeries->series_items[$i - 1];

                        $nCountPrecedingNullElements = 0;

                        $nSumKills = $oSeriesItem->kills;
                        $nSumDeaths = $oSeriesItem->deaths;

                        $j = $i - 1;
                        $nCountFlattened = 1;
                        // echo $i . ": ";
                        while ($j > 0 && $oSeries->series_items[$j]->deaths == 0 && $oSeries->series_items[$j]->kills == 0 && $nCountFlattened <= THRESHOLD_BACKTRACKING_COUNT) {
                            // echo "<-$j";
                            $j--;
                            $nCountFlattened++;
                        }

                        // echo "<br />";

                        // echo $j . " -> ";

                        if ($j > 0 && $nCountFlattened > 1 && ($oSeries->series_items[$j]->deaths < $oSeriesItem->deaths * THRESHOLD_VICTIM || $oSeries->series_items[$j]->kills < $oSeriesItem->kills * THRESHOLD_VICTIM)) {
                            //Preceding item is too small to be correct -> flatten as well

                            // echo "aay $j";
                            $nSumKills += $oSeries->series_items[$j]->kills;
                            $nSumDeaths += $oSeries->series_items[$j]->deaths;
                            $j--;
                            $nCountFlattened++;
                        }

                        // echo $i . ": " . $j . "<br />";
                        if ($nCountFlattened > 1 && $j >= 0) {
                            $nNewValueKills = ceil($nSumKills / ($nCountFlattened));
                            $nNewValueDeaths = ceil($nSumDeaths / ($nCountFlattened));

                            // echo "$i-" . ($j + 1) . ": $nNewValueDeaths = $nSumDeaths / " . ($i - $j) . " -> $nCountFlattened Schritte";

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

                            for ($k = $j + 1; $k <= $i; $k++) {
                                $oSeries->series_items[$k]->kills = $aNewValuesKills[$k];
                                $oSeries->series_items[$k]->deaths = $aNewValuesDeaths[$k];
                                $oSeries->series_items[$k]->flattened = true;
                            }

                            // print_r($aNewValuesKills);
                            // print_r($aNewValuesDeaths);
                            // echo "<br />";

                            $oMatch->flattened = true;
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
}



?>