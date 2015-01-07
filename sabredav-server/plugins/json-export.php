<?php

use
    Sabre\DAV\Server,
    Sabre\DAV\Plugin,
    Sabre\CalDAV,
    Sabre\DAV\ServerPlugin,
    Sabre\HTTP\RequestInterface,
    Sabre\HTTP\ResponseInterface,
    Sabre\VObject\Recur\EventIterator,
    Sabre\VObject\Reader,
    Sabre\VObject\Document;

class JsonExportPlugin extends ServerPlugin {

    protected $server;

    function getName() {

        return 'json-export';

    }

    function initialize(Server $server){

        $this->server = $server;

        $server->on('method:GET', function(RequestInterface $request, ResponseInterface $response) {

            if ($request->getPath() !== 'recordings.json') {
                return;
            }

            $upcomingEvents = $this->selectUpcomingEvents('/calendars/admin/recordings/');

            $response->setHeader('Content-Type', 'applicaion/json');
            if(is_array($upcomingEvents)) {
                $response->setStatus(200);
                $body = json_encode($upcomingEvents, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n";
                $response->setHeader('ETag', md5($body));
                $response->setBody($body);
            }

            else {
                $response->setStatus(500);
                $response->setBody('');
            }

            return false;

        }, 90);

    }

    function selectUpcomingEvents($parentPath) {

        $calDataProp = '{' . CalDAV\Plugin::NS_CALDAV . '}calendar-data';

        $nodes = $this->server->getPropertiesForPath($parentPath, [$calDataProp], 1);

        // read old state
        $events = array();
        foreach($nodes as $node) {
            if(!isset($node[200][$calDataProp]))
                continue;

            $doc = Reader::read($node[200][$calDataProp]);
            $uid = $doc->VEVENT->UID->getJsonValue()[0];

            $iterator = new EventIterator($doc, $uid);
            $iterator->fastForward(new DateTime());

            if($iterator->valid())
            {
                $nextEvent = $iterator->getEventObject();

                $dtstart = $nextEvent->DTSTART->getDateTime();
                $dtstart->setTimezone(new DateTimeZone('UTC'));

                $dtend = $nextEvent->DTEND->getDateTime();
                $dtend->setTimezone(new DateTimeZone('UTC'));

                $duration = $dtend->diff($dtstart);

                $events[] = array(
                    'name' => $doc->VEVENT->SUMMARY->getValue(),

                    'channel' => $doc->VEVENT->LOCATION ?
                        $doc->VEVENT->LOCATION->getValue():
                        null,

                    'date' => $dtstart->format('Y-m-d H:i:s\Z'),
                    'duration' => $duration->h * 60 + $duration->i,
                );
            }
        }

        return $events;
    }

}
