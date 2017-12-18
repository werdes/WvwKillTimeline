<?php

class series_item
{
    public $timeslot_start;
    public $timeslot_end;
    public $deaths;
    public $kills;
    public $error;
    public $flattened;

    function __construct()
    {
        $this->flattened = false;
    }
}

?>