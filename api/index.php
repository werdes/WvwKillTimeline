<?php

error_reporting(E_ALL);
header('Content-Type: application/json');

require_once("../inc/config.inc.php");
require_once("../class/alto_router.class.php");
// require_once("../class/series.class.php");
// require_once("../class/series_item.class.php");
// require_once("../class/match.class.php");


require_once("../inc/api_routes.inc.php");
require_once("../inc/cache.inc.php");

global $oRouter;

$oMatch = $oRouter->match();
if ($oMatch && is_callable($oMatch['target'])) {

    if (defined("DB_HOST") && defined("DB_USER") && defined("DB_PASSWORD") && defined("DB_NAME")) {
        call_user_func_array($oMatch['target'], $oMatch['params']);
    }
};

?>