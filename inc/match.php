<?php
error_reporting(0);
// error_reporting(E_ALL);
header('Content-Type: application/json');
require_once("config.inc.php");
require_once("../class/series.class.php");
require_once("../class/series_item.class.php");
require_once("../class/match.class.php");


if (defined("DB_HOST") && defined("DB_USER") && defined("DB_PASSWORD") && defined("DB_NAME")) {
    if (isset($_GET["match_id"]) && !empty($_GET["match_id"])) {
        $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

        $oMatch = new match();
        $oMatch->series = array();

        if (!$oConnection->connect_errno) {
            $cSqlStatement = "SELECT timeslot_kills.map_id, timeslot_kills.kills, timeslot_kills.deaths, match_worlds.color, `match`.arenanet_id as match_id, `match`.start_time AS match_start, `match`.end_time AS match_end, world.arenanet_id AS world_id, world.name as world_name, timeslot.start_time AS timeslot_start, timeslot.end_time AS timeslot_end, timeslot.`errors` as timeslot_errors FROM timeslot_kills INNER JOIN timeslot ON timeslot_kills.timeslot_id = timeslot.id INNER JOIN match_worlds ON timeslot_kills.match_worlds_id = match_worlds.id INNER JOIN world ON match_worlds.world_id = world.id INNER JOIN `match` ON match_worlds.match_id = `match`.id WHERE `match`.id = " . $oConnection->real_escape_string($_GET["match_id"]) . " AND ((100 / (timeslot.`errors` + timeslot.successes) * timeslot.`errors` < 10) or(timeslot.`errors` = 0 and timeslot.successes = 0))   ORDER BY timeslot.id ASC, match_worlds.color ASC, timeslot_kills.map_id ASC";

            $oSqlQuery = $oConnection->query($cSqlStatement);

            while ($oItem = $oSqlQuery->fetch_object()) {

                $oMatch->match_id = $oItem->match_id;
                $oMatch->match_start = $oItem->match_start;
                $oMatch->match_end = $oItem->match_end;

                $cKey = $oItem->map_id . "_" . $oItem->world_id;
                if (!array_key_exists($cKey, $oMatch->series)) {
                    $oSeries = new series();
                    $oSeries->world_id = $oItem->world_id;
                    $oSeries->world_name = $oItem->world_name;
                    $oSeries->map_id = $oItem->map_id;
                    $oSeries->color = $oItem->color;
                    $oSeries->series_items = array();

                    $oMatch->series[$cKey] = $oSeries;
                }

                $oSeriesItem = new series_item();
                $oSeriesItem->timeslot_start = $oItem->timeslot_start;
                $oSeriesItem->timeslot_end = $oItem->timeslot_end;

                if ($oItem->errors == 0) {
                    $oSeriesItem->kills = $oItem->kills;
                    $oSeriesItem->deaths = $oItem->deaths;
                    $oSeriesItem->error = false;
                } else {
                    $oSeriesItem->kills = 0;
                    $oSeriesItem->deaths = 0;
                    $oSeriesItem->error = true;
                }


                array_push($oMatch->series[$cKey]->series_items, $oSeriesItem);
            }

            echo json_encode($oMatch);

        }
    }
}



?>