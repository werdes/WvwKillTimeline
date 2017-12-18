<?php
error_reporting(0);
// error_reporting(E_ALL);
header('Content-Type: application/json');
require_once("config.inc.php");
require_once("../class/series.class.php");
require_once("../class/series_item.class.php");
require_once("../class/match.class.php");


if (defined("DB_HOST") && defined("DB_USER") && defined("DB_PASSWORD") && defined("DB_NAME")) {
    if (isset($_GET["slug"]) && !empty($_GET["slug"])) {
        $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);


        if (!$oConnection->connect_errno) {
            $cSqlStatement = "SELECT * FROM match_slug WHERE match_slug.slug = '" . $oConnection->real_escape_string($_GET["slug"]) . "';";

            $oSqlQuery = $oConnection->query($cSqlStatement);

            $oItem = $oSqlQuery->fetch_object();

            echo json_encode($oItem);
        }

    }
}
?>