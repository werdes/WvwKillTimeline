<?php

class match
{
    public $match_id;
    public $match_start;
    public $match_end;
    public $flattened;
    public $flattening_requested;
    public $last_update;
    public $series;

    function __construct()
    {
        $series = array();
    }
}

?>