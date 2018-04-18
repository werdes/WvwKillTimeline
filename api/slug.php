<?php

global $_SLUG;

if (isset($_SLUG) && !empty($_SLUG)) {
    $oConnection = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);


    if (!$oConnection->connect_errno) {
        $cSqlStatement = "SELECT * FROM match_slug WHERE match_slug.slug = '" . $oConnection->real_escape_string($_SLUG) . "';";

        $oSqlQuery = $oConnection->query($cSqlStatement);
        if ($oSqlQuery->num_rows > 0) {
            $oItem = $oSqlQuery->fetch_object();
            echo json_encode($oItem);
        } else {
            $cSlug = $oConnection->real_escape_string($_SLUG);
            // $cSlug = str_replace("-", " ", $cSlug);

            $cSqlStatementCurrentMatch = "select match_slug.* from match_slug inner join `match` on `match`.id = match_slug.match_id inner join match_worlds on match_worlds.match_id = `match`.id where match_slug.slug like '%" . $cSlug . "%' and UTC_TIMESTAMP between `match`.start_time and `match`.end_time";

            $oSqlQueryCurrentMatch = $oConnection->query($cSqlStatementCurrentMatch);

            $oItem = $oSqlQueryCurrentMatch->fetch_object();
            echo json_encode($oItem);

        }
    }


}
?>