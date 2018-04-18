<?php
require_once("../class/matchlist_entry.class.php");

define("CACHE_DIR", "../cache/");
define("CACHE_DURATION", 60);



if ((isset($_SELECTION) && !isset($_ID)) || (isset($_SELECTION) && $_SELECTION == "single" && isset($_ID) && !empty($_ID))) {

    cache_clear();
    if ($_SELECTION == "all") {
        if (cache_exist("matchlist_all")) {
            exit(json_encode(cache_get("matchlist_all")));
        }
    }

    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

    if (!$oConnection->connect_errno) {
        $cSqlStatement = "";
        $cWhereClause = "";
        if ($_SELECTION == "current") {
            $cWhereClause = "where UTC_TIMESTAMP BETWEEN `match`.start_time AND `match`.end_time ";
        } else if ($_SELECTION == "single") {
            $cWhereClause = "where `match`.id = " . $oConnection->real_escape_string($_ID);
        }

        $cSqlStatement = "SELECT GROUP_CONCAT(match_slug.slug SEPARATOR '|') as slugs, world.arenanet_id as world_id, world.name as world_name, `match`.id as match_id, `match`.arenanet_id as match_arenanet_id, `match`.start_time as match_start, `match`.end_time as match_end, `match`.last_update as match_last_update,  match_worlds.color, match_worlds.host, match_worlds.kills_sum as kills, match_worlds.deaths_sum as deaths from match_worlds inner join world on world.id = match_worlds.world_id inner join `match` on `match`.id = match_worlds.match_id inner join match_slug on match_slug.match_id = `match`.id  " . $cWhereClause . " GROUP BY match_worlds.id ORDER BY `match`.start_time desc, `match`.arenanet_id asc, match_worlds.color asc, match_worlds.host desc";

        $oSqlQuery = $oConnection->query($cSqlStatement);
        if ($oSqlQuery) {
            $aAusgabe = array();
            while ($oRow = $oSqlQuery->fetch_object()) {
                $cMatchKey = $oRow->match_arenanet_id . "_" . $oRow->match_id;
                if (!array_key_exists($cMatchKey, $aAusgabe)) {
                    $oMatchAusgabe = new matchlist_entry();
                    $oMatchAusgabe->id = $oRow->match_id;
                    $oMatchAusgabe->arenanet_id = $oRow->match_arenanet_id;
                    $oMatchAusgabe->start = $oRow->match_start;
                    $oMatchAusgabe->end = $oRow->match_end;
                    $oMatchAusgabe->worlds = array();
                    $oMatchAusgabe->slugs = explode('|', $oRow->slugs);
                    $oMatchAusgabe->last_update = $oRow->match_last_update;
                    $aAusgabe[$cMatchKey] = $oMatchAusgabe;
                }

                if (!array_key_exists($oRow->color, $aAusgabe[$cMatchKey]->worlds)) {
                    $oWorld = new matchlist_entry_world();
                    $oWorld->id = $oRow->world_id;
                    $oWorld->host = $oRow->host;
                    $oWorld->color = $oRow->color;
                    $oWorld->name = $oRow->world_name;
                    $oWorld->kills = $oRow->kills;
                    $oWorld->deaths = $oRow->deaths;

                    $aAusgabe[$cMatchKey]->worlds[$oRow->color] = $oWorld;
                } else {
                        //$aAusgabe[$cMatchKey]->worlds[$oRow->color]->additional_worlds = array();
                    $oWorld = new matchlist_entry_world();
                    $oWorld->id = $oRow->world_id;
                    $oWorld->host = $oRow->host;
                    $oWorld->color = $oRow->color;
                    $oWorld->name = $oRow->world_name;

                    $aAusgabe[$cMatchKey]->worlds[$oRow->color]->additional_worlds[$oRow->world_id] = $oWorld;
                }

            }

            echo json_encode($aAusgabe);

            if ($_SELECTION == "all") {
                cache_set("matchlist_all", $aAusgabe);
            }
        } else {
            echo mysqli_error($oConnection);
        }
    }

}

?>