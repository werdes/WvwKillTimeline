<?php

class series_item
{
    public $timeslot_start;
    public $timeslot_end;
    public $timeslot_id;
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