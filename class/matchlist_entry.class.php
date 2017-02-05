<?php

    class matchlist_entry {
        public $id;
        public $arenanet_id;
        public $start;
        public $end;
        
        public $worlds;

        function __construct() {
            $worlds = array();
        }
    }

    class matchlist_entry_world {
        public $id;
        public $color;
        public $host;
        public $name;

        public $additional_worlds;

        function __construct() {
            $additional_worlds = array();
        }
    }

?>