<?php
require("build.inc.php");

$bootstrapCssFile = "css/bootstrap/bootstrap.light" . BUILDID . ".min.css";
if (isset($_COOKIE["settings"]) && !empty($_COOKIE["settings"])) {
  $settingsCookie = json_decode($_COOKIE["settings"]);
  if (property_exists($settingsCookie, "darkmode")) {
    if ($settingsCookie->darkmode) {
      $bootstrapCssFile = "css/bootstrap/bootstrap.dark" . BUILDID . ".min.css";
    }
  }
}
?>

<!DOCTYPE html>

<html lang="en">

<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible"
    content="IE=edge">
  <meta name="viewport"
    content="width=device-width, initial-scale=1">
  <meta name="description"
    content="Want to know who killed whom how many times at what time?">
  <meta name="author"
    content="werdes">
  <title>WvW Kills</title>
  <!-- Bootstrap core CSS -->
  <link rel="stylesheet"
    name="bootstrap"
    type="text/css"
    href="<?= $bootstrapCssFile; ?>" />
  <link rel="stylesheet"
    type="text/css"
    href="https://cdn.datatables.net/v/bs/dt-1.10.16/fh-3.1.3/rg-1.0.2/datatables.min.css" />
  <link rel="stylesheet"
    type="text/css"
    href="css/ie10-viewport-bug-workaround<?=BUILDID?>.min.css" />
  <link rel="stylesheet"
    type="text/css"
    name="main"
    href="css/main<?=BUILDID?>.min.css" />
  <link rel="stylesheet"
    type="text/css"
    href="css/famfamfam-flags<?=BUILDID?>.min.css" />

  <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
      <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
</head>

<body>
  <div class="container page-content">
    <!--Header Start-->
    <div class="header clearfix">
      <nav>
        <div class="navbar-header">
          <button type="button"
            class="navbar-toggle collapsed"
            data-toggle="collapse"
            data-target="#bs-example-navbar-collapse-1"
            aria-expanded="false">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <div class="branding-container">
            <a class="text-muted branding"
              href="#/matches/current/">
              WvW Kills
            </a>
          </div>
        </div>
        <div class="collapse navbar-collapse"
          id="bs-example-navbar-collapse-1">
          <ul class="nav nav-pills pull-right">
            <li class="">
              <a href="#/timezones/"
                id="show-timezones">
                <i class="icon icon-timezone"></i> Timezones</a>
              <div class="information-addon hidden"
                id="information-addon-timezones">

                <div class="alert alert-info"
                  role="alert">
                  <button type="button"
                    id="button-close-tip-timezones"
                    class="close"
                    data-dismiss="alert"
                    aria-label="Close">
                    <span aria-hidden="true">×</span>
                  </button>
                  <span class="glyphicon glyphicon-info-sign"></span> <strong>New</strong>
                  <br />
                  You can now see the most active time zones per world by heading over to the <strong>Timezones</strong>
                  page!

                </div>
              </div>
            </li>
            <li class="">
              <a href="#/worldranking/"
                id="show-world-ranking">
                <i class="icon icon-ranking"></i> World Ranking</a>
            </li>
            <li class="">
              <a href="#/matches/archive/1/"
                id="show-all-matches">
                <i class="icon icon-archive"></i> Match Archive</a>
            </li>
            <li class="dropdown">
              <a href="javascript:void(0);"
                class="dropdown-toggle"
                data-toggle="dropdown"
                role="button"
                aria-haspopup="true"
                aria-expanded="false"
                id="current-matches-dropdown">
                <i class="icon icon-current"></i> Current matchups
                <span class="caret"></span>
              </a>
              <ul class="dropdown-menu dropdown-menu-right"
                id="menu-current-matchups">
              </ul>
            </li>
            <li class="nightmode">
              <a href="javascript:void(0)"
                id="nightmode">
                <span title="Dark mode"
                  class="nightmode-switch">
                  <i class="icon icon-nightmode"></i>
                </span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
      <!-- <h3 class="text-muted" id="headline">
        <a href="#/">WvW Kills</a>
      </h3> -->

    </div>
    <!--Header End-->


    <div class="container content"
      id="message-container">
    </div>

    <!--Loading Spinner Start-->
    <div id="loading-container"
      class="no-nightmode">
      <img src="img/knight.png" />
      <h3>This may take a little longer ...</h3>
    </div>


    <!--Matchlist Start-->
    <div class="container content hidden"
      id="matchlist">
      <div class="pull-right form-group matchlist-search">
        <input type="text"
          class="form-control"
          placeholder="Search"
          id="matchlist-search" />
      </div>

      <div class="clear-both"
        id="matchlist-container"></div>
    </div>
    <!--Matchlist end-->

    <!--Match Start-->
    <div class="hidden content"
      id="match">
      <h5 id="match-last-update"></h5>
      <h2 class="pull-left"
        id="match-title"></h2>
      <span class="pull-left label label-warning"
        id="match-current-range-selection"></span>
      <div class="information-addon hidden"
        id="information-addon-time-range-selection">

        <div class="alert alert-info"
          role="alert">
          <button type="button"
            id="button-close-tip-time-range-selection"
            class="close"
            data-dismiss="alert"
            aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
          <span class="glyphicon glyphicon-info-sign"></span> <strong>New</strong>
          <br />
          You can now filter stats for a selected time range by moving or resizing the <strong>slider</strong>
          underneath the graph.
          <br />
          You can turn that function <i>off</i> under <strong>Options -> Values by Range Selection</strong>

        </div>
      </div>

      <a class="get-shortlink btn btn-success pull-right no-nightmode"
        data-toggle="modal"
        data-target="#modal-shortlink"
        role="button">
        <i class="glyphicon glyphicon-link"></i> Get Shortlink</a>
      <a class="reload-chart btn btn-primary pull-right no-nightmode"
        role="button"
        id="reload-chart">
        <i class="glyphicon glyphicon-refresh no-nightmode"></i> Refresh</a>
      <div class="btn-group pull-right grp-options">
        <button type="button"
          class="btn btn-warning dropdown-toggle no-nightmode"
          data-toggle="dropdown"
          aria-haspopup="true"
          aria-expanded="false">
          <span class="glyphicon glyphicon-cog"></span> Options <span class="caret"></span>
        </button>
        <ul class="dropdown-menu">
          <li class="checkable">
            <a href="javascript:void(0);"
              data-target="flattening"
              data-value="true"><span class="glyphicon glyphicon-ok"></span> Flattening</a>
          </li>
          <li class="checkable">
            <a href="javascript:void(0);"
              data-target="smoothing"
              data-value="false">
              <span class="glyphicon glyphicon-ok"></span> Smoothing</a>
          </li>
          <li class="checkable">
            <a href="javascript:void(0);"
              data-target="range_selection"
              data-value="true"><span class="glyphicon glyphicon-ok"></span> Values by Range Selection</a>
          </li>
        </ul>
      </div>
      <div class="clearfix">
      </div>
      <div class="well"
        id="match-statistics-container">
      </div>
      <div class="well"
        id="chart-container">
        <div class="information-addon hidden"
          id="information-addon-copystats">

          <div class="alert alert-info"
            role="alert">
            <span class="glyphicon glyphicon-info-sign"></span> <strong>Tip:</strong>
            <button type="button"
              id="button-close-tip-copystats"
              class="close"
              data-dismiss="alert"
              aria-label="Close">
              <span aria-hidden="true">×</span>
            </button>

            Click on a point to copy statistics for that timeslot

          </div>
        </div>
        <div class="chart-backgrounds">
          <div class="chart-background-kills">
            <p>Kills</p>
          </div>
          <div class="chart-background-deaths">
            <p>Deaths</p>
          </div>
        </div>
        <div id="main-chart-container">
        </div>
      </div>
    </div>
    <!--Match End-->

    <!-- World Ranking Start -->
    <div class="hidden content"
      id="world-ranking">
      <!-- <div class="well"> -->
      <table id="table-world-ranking"
        class="table table-striped table-bordered"
        width="100%"
        cellspacing="0">
        <thead>
          <tr>
            <th>Worlds</th>
            <th>Matches</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>&empty; Kills / Match</th>
            <th>&empty; Deaths / Match</th>
            <th>K/D Ratio</th>
            <th>PPK Ratio</th>
          </tr>
        </thead>
      </table>
      <!-- </div> -->
    </div>
    <!-- World Ranking End -->
    <div class="hidden content"
      id="timezones">
      <div class="timezones-infos">
        <span class="text-muted">Hover over the ranges to see more details.</span><br />
        <span class="text-muted"><strong>Primetime</strong> is determined by either the <span
            id="timezones-max-timeslots"></span> strongest consecutive timeslots or by reaching 50% of the world's total
          score in that time.</span><br />
        <span class="text-muted"
          id="timezones-last-updated"></span>
      </div>
      <div id="timezones-container"></div>
    </div>

    <!-- Legal Start -->
    <div class="hidden content"
      id="legal-notice">
    </div>
    <!-- Legal End -->

    <footer class="footer">
      <p class="pull-left">&copy; 2016 -
        <span id="current-year"></span>
        <a href="http://www.werdes.net">Werdes</a>
      </p>
      <p class="pull-right">
        <a href="#/legal/">Legal notice</a> | icons by
        <a href="https://icons8.com/">icon8</a>
      </p>
      <div class="clearfix"></div>
      <p>
        <small>
          NCSOFT, the interlocking NC logo, ArenaNet, Guild Wars, Guild Wars Factions, Guild Wars Nightfall, Guild
          Wars: Eye of the
          North, Guild Wars 2, and all associated logos and designs are trademarks or registered trademarks of NCSOFT
          Corporation.
          All other trademarks are the property of their respective owners.
        </small>
      </p>
    </footer>
  </div>
  <div id="modal-shortlink"
    class="modal fade bs-example-modal-sm"
    tabindex="-1"
    role="dialog">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button"
            class="close"
            data-dismiss="modal"
            aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title"
            id="modal-shortlink-label">Shortlink</h4>
        </div>
        <div class="modal-body">
          <input type="text"
            class="form-control"
            id="shortlink-textbox">
        </div>
        <div class="modal-footer">
          <button type="button"
            data-clipboard-target="#shortlink-textbox"
            id="copy-shortlink"
            class="btn btn-success no-nightmode">Copy</button>
          <button type="button"
            class="btn btn-primary no-nightmode"
            data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div id="copy-timeslot"
    class="hidden"
    role="tooltip">
    <ul>
      <li>
        <span class="context-header"
          id="copy-timeslot-header"></span>
      </li>
      <li>
        <a id="copy-timeslot-green"
          class="copy-timeslot btn btn-xs btn-success">
          <span class="glyphicon glyphicon-copy"></span> Copy for
          <span id="copy-timeslot-green-name"></span>
        </a>
      </li>
      <li>
        <a id="copy-timeslot-blue"
          class="copy-timeslot btn btn-xs btn-primary">
          <span class="glyphicon glyphicon-copy"></span> Copy for
          <span id="copy-timeslot-blue-name"></span>
        </a>
      </li>
      <li>
        <a id="copy-timeslot-red"
          class="copy-timeslot btn btn-xs btn-danger">
          <span class="glyphicon glyphicon-copy"></span> Copy for
          <span id="copy-timeslot-red-name"></span>
        </a>
      </li>
      <li>
        <a id="copy-timeslot-cancel"
          class="btn btn-xs btn-default">
          <span class="glyphicon glyphicon-remove"></span> Cancel</a>
      </li>
    </ul>
  </div>

  <script type="text/javascript"
    src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
  <script type="text/javascript"
    src="https://cdn.datatables.net/v/bs/dt-1.10.15/fh-3.1.2/datatables.min.js"></script>
  <script type="text/javascript"
    src="//cdn.datatables.net/plug-ins/1.10.15/sorting/percent.js"></script>
  <script type="text/javascript"
    src="js/sammy<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/jquery.cookie<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/highstock<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/highcharts.zeroalign<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/highcharts.customEvents<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/bootstrap<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/moment<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/clipboard<?=BUILDID?>.min.js"></script>
  <script type="text/javascript"
    src="js/kills<?=BUILDID?>.min.js"></script>

  <link rel="stylesheet"
    type="text/css"
    href="//cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.0.3/cookieconsent.min.css" />
  <script src="//cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.0.3/cookieconsent.min.js"></script>
  <script>
    window.addEventListener("load", function () {
      window.cookieconsent.initialise({
        "palette": {
          "popup": {
            "background": "#eaf7f7",
            "text": "#5c7291"
          },
          "button": {
            "background": "#56cbdb",
            "text": "#ffffff"
          }
        },
        "theme": "edgeless",
        "position": "top-right",
        "content": {
          "href": "#/legal/"
        }
      })
    });
  </script>

</body>

</html>