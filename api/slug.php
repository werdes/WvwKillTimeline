<?php

global $_SLUG;

if (isset($_SLUG) && !empty($_SLUG)) {
    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);


    if (!$oConnection->connect_errno) {
        $cSqlStatement = "SELECT * FROM match_slug WHERE match_slug.slug = '" . $oConnection->real_escape_string($_SLUG) . "';";

        $oSqlQuery = $oConnection->query($cSqlStatement);

        $oItem = $oSqlQuery->fetch_object();

        echo json_encode($oItem);
    }


}
?>