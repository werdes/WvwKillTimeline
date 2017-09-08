<?php

function cache_clear() {
    if(defined("CACHE_DIR")) {
        if(file_exists(CACHE_DIR) && defined("CACHE_DURATION")) {
            $aFiles = glob(CACHE_DIR . "*.cache");
            foreach($aFiles as $cFile) {
                if(is_file($cFile)) {
                    if(time() - filemtime($cFile) >= CACHE_DURATION) {
                        unlink($cFile);
                    }
                }
            }
        }
    }
}

function cache_set($cKey, $oObject) {
    if(defined("CACHE_DIR")) {
        if(file_exists(CACHE_DIR)) {
            if(!cache_exist($cKey)) {
                $cJSON = json_encode($oObject);
                $cFilename = CACHE_DIR . $cKey . ".cache";
                
                file_put_contents($cFilename, $cJSON);
            }
        }
    }
}

function cache_get($cKey) {
    if(defined("CACHE_DIR")) {
        if(file_exists(CACHE_DIR)) {
            if(cache_exist($cKey)) {
                $cFilename = CACHE_DIR . $cKey . ".cache";
                $cJSON = file_get_contents($cFilename);
                return json_decode($cJSON);
            }
        }
    }
}

function cache_exist($cKey) {
    if(defined("CACHE_DIR")) {
        if(file_exists(CACHE_DIR)) {
            $cCacheFileName = CACHE_DIR . $cKey . ".cache";
            return file_exists($cCacheFileName);
        }
    }
}

?>