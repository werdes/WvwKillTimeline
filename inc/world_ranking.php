<?php
error_reporting(0);
// error_reporting(E_ALL);
header('Content-Type: application/json');
require_once("config.inc.php");
require_once("../class/world.class.php");
require_once("../class/link.class.php");
require_once("../class/link_partner.class.php");


if(defined("DB_HOST") && defined("DB_USER") && defined("DB_PASSWORD") && defined("DB_NAME")) {
    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);
    if(!$oConnection->connect_errno) {
        $cSqlCrudeLinkings = "select * from v_crude_linkings;";
        $oQueryCrudeLinkings = $oConnection->query($cSqlCrudeLinkings);
        
        $cSqlWorldNames = "select * from world;";
        $oQueryWorldNames = $oConnection->query($cSqlWorldNames);
        $aWorldNames = array();
        while($oItem = $oQueryWorldNames->fetch_object()) {
            $aWorldNames[$oItem->id] = $oItem;
        }
        
        $aWorlds = array();
        
        while($oItem = $oQueryCrudeLinkings->fetch_object()) {
            $aWorldIDs = explode(',', $oItem->world_ids);
            $aMatchIDs = explode(',', $oItem->match_ids);
            
            
            $nHostWorldId = $aWorldIDs[0];
            
            if(!array_key_exists($nHostWorldId, $aWorlds)) {
                $oWorld = new world();
                $oWorld->id = $nHostWorldId;
                $oWorld->name = $aWorldNames[$oWorld->id]->name;
                $oWorld->linkings = array();
                $aWorlds[$oWorld->id] = $oWorld;
            }
            
            $oLinking = new link();
            $oLinking->partners = array();
            
            for($i = 1; $i < count($aWorldIDs); $i++) {
                $oLinkingPartner = new link_partner();
                $oLinkingPartner->id = $aWorldIDs[$i];
                $oLinkingPartner->name = $aWorldNames[$oLinkingPartner->id]->name;
                array_push($oLinking->partners, $oLinkingPartner);
            }
            
            
            
            $cSqlStatementLinking = "select sum(kills) as kills, sum(deaths) as deaths from timeslot_kills inner join match_worlds on match_worlds.id = timeslot_kills.match_worlds_id where match_worlds.match_id in (" . $oConnection->real_escape_string($oItem->match_ids) . ") and match_worlds.world_id in (" . $oConnection->real_escape_string($oItem->world_ids) . ")";
            $oSqlQueryLinking = $oConnection->query($cSqlStatementLinking);
            $oLinkingResult = $oSqlQueryLinking->fetch_object();
            
            $oLinking->kills = intval($oLinkingResult->kills);
            $oLinking->deaths = intval($oLinkingResult->deaths);
            $oLinking->matchcount = count($aMatchIDs);
            
            array_push($aWorlds[$nHostWorldId]->linkings, $oLinking);
            
            
        }
        
        echo json_encode($aWorlds);
    }
}
?>