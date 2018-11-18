<?php

require_once("class/world.class.php");
require_once("class/link.class.php");
require_once("class/link_partner.class.php");


define("CACHE_DIR", "../cache/");
define("CACHE_DURATION", 300);
require_once("../inc/cache.inc.php");

cache_clear();

if (cache_exist("world_ranking")) {
    echo json_encode(cache_get("world_ranking"));
} else {

    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
    if (!$oConnection->connect_errno) {
        $cSqlCrudeLinkings = "select * from v_crude_linkings;";
        $oQueryCrudeLinkings = $oConnection->query($cSqlCrudeLinkings);

        $cSqlWorldNames = "select * from world;";
        $oQueryWorldNames = $oConnection->query($cSqlWorldNames);
        $aWorldNames = array();
        while ($oItem = $oQueryWorldNames->fetch_object()) {
            $aWorldNames[$oItem->id] = $oItem;
        }

        $aWorlds = array();

        while ($oItem = $oQueryCrudeLinkings->fetch_object()) {
            $aWorldIDs = explode(',', $oItem->world_ids);
            $aMatchIDs = explode(',', $oItem->match_ids);


            $nHostWorldId = $aWorldIDs[0];

            if (!array_key_exists($nHostWorldId, $aWorlds)) {
                $oWorld = new world();
                $oWorld->id = $nHostWorldId;
                $oWorld->name = $aWorldNames[$oWorld->id]->name;
                $oWorld->linkings = array();
                $oWorld->arenanet_id = $aWorldNames[$oWorld->id]->arenanet_id;
                $aWorlds[$oWorld->id] = $oWorld;
            }

            $oLinking = new link();
            $oLinking->partners = array();

            for ($i = 1; $i < count($aWorldIDs); $i++) {
                $oLinkingPartner = new link_partner();
                $oLinkingPartner->id = $aWorldIDs[$i];
                $oLinkingPartner->name = $aWorldNames[$oLinkingPartner->id]->name;
                array_push($oLinking->partners, $oLinkingPartner);
            }



            $cSqlStatementLinking = "select sum(match_worlds.kills_sum) as kills, sum(match_worlds.deaths_sum) as deaths from match_worlds where match_worlds.match_id in  (" . $oConnection->real_escape_string($oItem->match_ids) . ") and match_worlds.world_id in (" . $oConnection->real_escape_string($oItem->world_ids) . ")";
            $oSqlQueryLinking = $oConnection->query($cSqlStatementLinking);
            $oLinkingResult = $oSqlQueryLinking->fetch_object();

            $oLinking->kills = intval($oLinkingResult->kills);
            $oLinking->deaths = intval($oLinkingResult->deaths);
            $oLinking->matchcount = count($aMatchIDs);

            array_push($aWorlds[$nHostWorldId]->linkings, $oLinking);


        }
        cache_set("world_ranking", $aWorlds);
        echo json_encode($aWorlds);

    }
}
?>