<?php
global $oRouter;
$oRouter = new alto_router();


$oRouter->setBasePath(BASE_PATH . "/api");
$oRouter->addMatchTypes(array('slug' => '[0-9A-Za-z.-]+'));

$oRouter->addRoutes(array(

/**
 * V1
 */
    array('GET', '/v1/slug/[slug:slug][a:random]?', function ($slug) {
        global $_SLUG;

        $_SLUG = $slug;
        require $_SERVER["DOCUMENT_ROOT"] . BASE_PATH . '/api/v1/slug.php';
    }),
    array('GET', '/v1/matchlist/[current|all:selection][a:random]?', function ($selection) {
        global $_SELECTION;
        $_SELECTION = $selection;

        require $_SERVER["DOCUMENT_ROOT"] . BASE_PATH . '/api/v1/matchlist.php';
    }),
    array('GET', '/v1/matchlist/single/[i:id][a:random]?', function ($id) {
        global $_SELECTION;
        global $_ID;
        $_SELECTION = "single";
        $_ID = $id;


        require $_SERVER["DOCUMENT_ROOT"] . BASE_PATH . '/api/v1/matchlist.php';
    }),
    array('GET', '/v1/match/[i:id]/[flattened|unaltered:options][a:random]?', function ($id, $options) {
        global $_FLATTEN;
        global $_ID;
        $_FLATTEN = $options == 'flattened';
        $_ID = $id;

        require $_SERVER["DOCUMENT_ROOT"] . BASE_PATH . '/api/v1/match.php';
    }),
    array('GET', '/v1/worldranking[a:random]?', function () {
        require $_SERVER["DOCUMENT_ROOT"] . BASE_PATH . '/api/v1/world_ranking.php';
    }),

/**
 * V2
 */

));

?>
