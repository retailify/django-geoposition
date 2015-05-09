if (jQuery !== undefined) {
    var django = {
        'jQuery': jQuery
    };
}


(function ($) {
    'use strict';
    
    $(document).ready(function () {
        var defaultLanguage = 'en',
            currentLanguage = 'en',
            locales = {
            "en": {
                "google_reference_error": "\"google\" not defined.  You might not be connected to the internet.",
                "cookie_reference_error": "can't read django language from cookie",
                "start_typing" : "Start typing an address …",
                "goto_marker" : "Goto Marker Position"
            },
            "de":{
                "google_reference_error": "\"google\" nicht definiert. Sie sind eventuell nicht mit dem Internet verbunden.",
                "cookie_reference_error": "Das Django Sprach-Cookie kann nicht gelesen werden.",
                "start_typing" : "Geben Sie eine Adresse ein …",
                "goto_marker" : "Springe zum Marker"
            }
        };
        
        /** 
         * method from w3schools 
         * http://www.w3schools.com/js/js_cookies.asp
         **/
        function getCookie(cname) {
            var name = cname + "=",
                ca = document.cookie.split(';'),
                i = 0;
            for (i; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1);
                if (c.indexOf(name) === 0) return c.substring(name.length,c.length);
            }
            return "";
        } 

        try {
            currentLanguage = getCookie('django_language');
            if (locales[currentLanguage] === null){
                currentLanguage = defaultLanguage;
            }
        } catch (ReferenceError){
            console.log('geoposition: '+ locales[currentLanguage].cookie_reference_error);
            currentLanguage = defaultLanguage;
        }
        
        try {
            var _ = google;
        } catch (ReferenceError) {
            console.log('geoposition: '+ locales[currentLanguage].google_reference_error);
            return;
        }
        
        var useAddonSearch = false,
            city_selectbox = false,
            city_selectbox_selector='select#id_city',
            street_selector = '#id_street',
            street_number_selector = '#id_street_number';
        
        // check additions
        if ($('#id_city').length && $(street_selector).length && $(street_number_selector).length){
            console.log("useAddonSearch");
            useAddonSearch = true;
        }
        
        if (useAddonSearch && $(city_selectbox_selector).length) {
            console.log("selectbox found");
            city_selectbox = true;
        }
        
        var mapDefaults = {
            'mapTypeId': google.maps.MapTypeId.ROADMAP,
            'scrollwheel': false,
            'streetViewControl': false,
            'panControl': false
        };

        var markerDefaults = {
            'draggable': true,
            'animation': google.maps.Animation.DROP
        };

        $('.geoposition-widget').each(function() {
            var $container = $(this),
                $mapContainer = $('<div class="geoposition-map" />'),
                $addressRow = $('<div class="geoposition-address" />'),
                $searchRow = $('<div class="geoposition-search" />'),
                $searchInput = $('<input>', {'type': 'search', 'placeholder': locales[currentLanguage].start_typing}),
                $latitudeField = $container.find('input.geoposition:eq(0)'),
                $longitudeField = $container.find('input.geoposition:eq(1)'),
                $gotoMarkerButton = $container.find('input.goto-marker'), 
                latitude = parseFloat($latitudeField.val()) || null,
                longitude = parseFloat($longitudeField.val()) || null,
                map,
                mapLatLng,
                mapOptions,
                mapCustomOptions,
                markerOptions,
                markerCustomOptions,
                marker;
            
            $mapContainer.css('height', $container.data('map-widget-height') + 'px');
            mapCustomOptions = $container.data('map-options') || {};
            markerCustomOptions = $container.data('marker-options') || {};

            function doSearch(searchInput) {
                console.log(searchInput);
                var gc = new google.maps.Geocoder();
                $searchInput.parent().find('ul.geoposition-results').remove();
                gc.geocode({
                    'address': searchInput
                }, function(results, status) {
                    if (status == 'OK') {
                        var updatePosition = function(result) {
                            if (result.geometry.bounds) {
                                map.fitBounds(result.geometry.bounds);
                            } else {
                                map.panTo(result.geometry.location);
                                map.setZoom(18);
                            }
                            marker.setPosition(result.geometry.location);
                            google.maps.event.trigger(marker, 'dragend');
                        };
                        if (results.length == 1) {
                            updatePosition(results[0]);
                        } else {
                            var $ul = $('<ul />', {'class': 'geoposition-results'});
                            $.each(results, function(i, result) {
                                var $li = $('<li />');
                                $li.text(result.formatted_address);
                                $li.on('click', function() {
                                    updatePosition(result);
                                    $li.closest('ul').remove();
                                });
                                $li.appendTo($ul);
                            });
                            $searchInput.after($ul);
                        }
                    }
                });
            }                
            
            function getGeocodedContent(geoResult, searchString){
                if (geoResult.address_components.length > 0)
                {
                    for (var i in geoResult.address_components) {                        
                        if (geoResult.address_components[i].types[0] === searchString) {
                            return geoResult.address_components[i].long_name;
                        }
                    }   
                } else {
                    return "";
                }
            }
            
            function doGotoMarker() {
                var latitude = parseFloat($latitudeField.val()) || 0;
                var longitude = parseFloat($longitudeField.val()) || 0;
                var center = new google.maps.LatLng(latitude, longitude);
                map.setCenter(center);
                map.setZoom(15);
                marker.setPosition(center);
            }
            
            function doGeocode() {
                var gc = new google.maps.Geocoder();
                gc.geocode({
                    'latLng': marker.position
                }, function(results, status) {
                    $addressRow.text('');
                    if (results && results[0]) {                                                
                        if ( useAddonSearch ) {
                            $(street_selector).val(getGeocodedContent(results[0], 'route'));
                            $(street_number_selector).val(getGeocodedContent(results[0], 'street_number'));                            
                        } else {
                            $addressRow.text(results[0].formatted_address);
                        }
                    }
                });
            }
            
            $gotoMarkerButton.on('click', function (ev) {
                doGotoMarker();
                ev.preventDefault();
            });
                                            
            if( useAddonSearch ) {
                $container.append($mapContainer);
                var timer = null;
                if (city_selectbox) {
                    var searchString = '';
                    $(city_selectbox_selector).change(function () {
                        $(street_selector).val('');
                        $(street_number_selector).val('');
                        searchString = $(this).find("option:selected").text();                        
                        doSearch(searchString);
                    });
                    
                    //$(street_selector).on('keydown', searchCallbackFunction(timer,event));
                    
                }
            } else {
                var autoSuggestTimer = null;
                $searchInput.on('keydown', function(e) {
                    if (autoSuggestTimer) {
                        clearTimeout(autoSuggestTimer);
                        autoSuggestTimer = null;
                    }

                    // if enter, search immediately
                    if (e.keyCode == 13) {
                        e.preventDefault();
                        doSearch($searchInput.val());
                    }
                    else {
                        // otherwise, search after a while after typing ends
                        autoSuggestTimer = setTimeout(function(){
                            doSearch($searchInput.val());
                        }, 1000);
                    }
                }).on('abort', function() {
                    $(this).parent().find('ul.geoposition-results').remove();
                });
                $container.append($searchRow, $mapContainer, $addressRow);
                $searchInput.appendTo($searchRow);
            }

            mapLatLng = new google.maps.LatLng(latitude, longitude);

            mapOptions = $.extend({}, mapDefaults, mapCustomOptions);

            if (!(latitude === null && longitude === null && mapOptions['center'])) {
                mapOptions['center'] = mapLatLng;
            }

            if (!mapOptions['zoom']) {
                mapOptions['zoom'] = latitude && longitude ? 15 : 1;
            }

            map = new google.maps.Map($mapContainer.get(0), mapOptions);
            markerOptions = $.extend({}, markerDefaults, markerCustomOptions, {
                'map': map
            });

            if (!(latitude === null && longitude === null && markerOptions['position'])) {
                markerOptions['position'] = mapLatLng;
            }

            marker = new google.maps.Marker(markerOptions);
            google.maps.event.addListener(marker, 'dragend', function() {
                $latitudeField.val(this.position.lat());
                $longitudeField.val(this.position.lng());
                doGeocode();
            });
            if ($latitudeField.val() && $longitudeField.val()) {
                google.maps.event.trigger(marker, 'dragend');
            }

            $latitudeField.add($longitudeField).on('keyup', function(e) {
                var latitude = parseFloat($latitudeField.val()) || 0;
                var longitude = parseFloat($longitudeField.val()) || 0;
                var center = new google.maps.LatLng(latitude, longitude);
                map.setCenter(center);
                map.setZoom(15);
                marker.setPosition(center);
                doGeocode();
            });
        });
    });
})(django.jQuery);
