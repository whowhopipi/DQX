﻿/************************************************************************************************************************************
*************************************************************************************************************************************

Defines a FramePanel that encapsulates a Google Maps view with overlays

*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSCJQ(), DQXSC("data/countries"), DQXSC("lib/geo_json"), DQXSC("lib/StyledMarker"), DQXSC("Msg"), DQXSC("DocEl"), DQXSC("Utils"), DQXSC("FramePanel"), DQXSCAsync("https://maps.googleapis.com/maps/api/js?libraries=visualization&sensor=false")],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel) {

        var GMaps = {}


        GMaps.Coord = function (longit, lattit) {
            var that = {};
            that.longit = longit;
            that.lattit = lattit;

            that.toGoogleLatLng = function () {
                return new google.maps.LatLng(this.lattit, this.longit);
            }

            return that;
        }


        GMaps.MapItemLayouter = function (imapobject, iid) {
            var that = {};
            that.mapObject = imapobject;
            that.id = iid;
            that.items = [];

            that.addItem = function (longit, lattit, radius) {
                this.items.push({ longit: longit, lattit: lattit, radius: radius, longit2: longit, lattit2: lattit });
            }

            that.DX2Longit = function (dx, lattit) {
                return dx / Math.cos(lattit / 180 * Math.PI) / 40000 * 360;
            }

            that.DY2Lattit = function (dy) {
                return dy / 40000 * 360;
            }

            that.Longit2X = function (longit, lattit) {
                return longit * Math.cos(lattit / 180 * Math.PI) * 40000 / 360;
            }

            that.Lattit2Y = function (lattit) {
                return lattit / 360 * 40000;
            }


            that.calculatePositions0 = function () {
                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    item.x0 = this.Longit2X(item.longit, item.lattit);
                    item.y0 = this.Lattit2Y(item.lattit);
                    item.dx = 0;
                    item.dy = 0;
                }

                //Calculate average distance
                var avDst = 0;
                var dstCnt = 0;
                for (var i1 = 0; i1 < this.items.length; i1++) {
                    var item1 = this.items[i1];
                    for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                        var item2 = this.items[i2];
                        var dfx = item2.x0 - item1.x0;
                        var dfy = item2.y0 - item1.y0;
                        var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                        avDst += dst;
                        dstCnt++;
                    }
                }
                avDst /= dstCnt;

                for (var iter = 0; iter < 50; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = (item2.x0 + item2.dx) - (item1.x0 + item1.dx);
                            var dfy = (item2.y0 + item2.dy) - (item1.y0 + item1.dy);
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            var dst2 = 0.01 + dst / avDst;
                            dfx /= dst; dfy /= dst;
                            var shiftsize = 0.5 / (dst2 * dst2);
                            shiftx += -dfx * shiftsize;
                            shifty += -dfy * shiftsize;
                        }
                        item1.dx += 0.5 * shiftx;
                        item1.dy += 0.5 * shifty;
                    }
                }

                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    var longit2 = item.longit + this.DX2Longit(item.dx, item.lattit);
                    var lattit2 = item.lattit + this.DY2Lattit(item.dy);
                    item.longit2 = longit2;
                    item.lattit2 = lattit2;
                }

            }


            that.calculatePositions = function () {
                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    item.x0 = this.Longit2X(item.longit, item.lattit);
                    item.y0 = this.Lattit2Y(item.lattit);
                    item.dx = 0;
                    item.dy = 0;
                }

                //Calculate initial directions
                for (var iter = 0; iter < 100; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = item2.x0 - item1.x0;
                            var dfy = item2.y0 - item1.y0;
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            shiftx += -dfx / (dst * dst * dst);
                            shifty += -dfy / (dst * dst * dst);
                        }
                        item1.dx = 30 * shiftx / Math.sqrt(shiftx * shiftx + shifty * shifty);
                        item1.dy = 30 * shifty / Math.sqrt(shiftx * shiftx + shifty * shifty);
                    }
                }

                for (var iter = 0; iter < 50; iter++) {
                    for (var i1 = 0; i1 < this.items.length; i1++) {
                        var item1 = this.items[i1];
                        var shiftx = 0;
                        var shifty = 0;
                        for (var i2 = 0; i2 < this.items.length; i2++) if (i1 != i2) {
                            var item2 = this.items[i2];
                            var dfx = (item2.x0 + item2.dx) - (item1.x0 + item1.dx);
                            var dfy = (item2.y0 + item2.dy) - (item1.y0 + item1.dy);
                            var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                            var mindst = 1.2 * (item1.radius + item2.radius);
                            if (dst < mindst) {
                                var shiftsize = (mindst - dst) / dst;
                                shiftx += -dfx * shiftsize;
                                shifty += -dfy * shiftsize;
                            }
                            else if (dst < 4 * mindst) {
                                var shiftsize = 0.05 / (dst * dst * dst);
                                shiftx += -dfx * shiftsize;
                                shifty += -dfy * shiftsize;
                            }
                        }
                        if (iter > 1) {
                            for (var i2 = 0; i2 < this.items.length; i2++) {
                                var item2 = this.items[i2];
                                var dfx = (item2.x0) - (item1.x0 + item1.dx);
                                var dfy = (item2.y0) - (item1.y0 + item1.dy);
                                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                                var mindst = 1.4 * (item1.radius);
                                if (dst < mindst) {
                                    var shiftsize = (mindst - dst) / dst;
                                    shiftx += -dfx * shiftsize;
                                    shifty += -dfy * shiftsize;
                                }
                            }
                        }
                        item1.dx += 0.1 * shiftx;
                        item1.dy += 0.1 * shifty;
                    }
                }

                for (var i = 0; i < this.items.length; i++) {
                    var item = this.items[i];
                    var longit2 = item.longit + this.DX2Longit(item.dx, item.lattit);
                    var lattit2 = item.lattit + this.DY2Lattit(item.dy);
                    item.longit2 = longit2;
                    item.lattit2 = lattit2;
                }
            }
            return that;
        };


        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a KML
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.KML = function (iid, imapobject, kmlurl) {
            var that = {};

            that.myID = iid;
            that.myMapObject = imapobject;
            that.myMapObject._addOverlay(that);
            that.myKmlUrl = kmlurl;

            that.kml = new google.maps.KmlLayer(that.myKmlUrl);
            that.kml.setMap(that.myMapObject.myMap);

            that.remove = function () {
                this.kml.setMap(null);
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a Country
        //////////////////////////////////////////////////////////////////////////////////////////
        GMaps.Country = function (iid, imapobject, country_name, gmap_options) {
            google_objs = GeoJSON(Countries.geo_json_by_fullname[country_name], gmap_options);
            if (google_objs.error) {
                console.log(google_objs);
                return;
            }
            var that = {};
            that.myID = iid;
            that.myMapObject = imapobject
            that.myMapObject._addOverlay(that);
            that.myData = country_name;
            that.myObjects = [];
            for (var i = 0; i < google_objs.length; i++) {
                that.myObjects.push(google_objs[i]);
                google_objs[i].setMap(that.myMapObject.myMap);
                google.maps.event.addListener(google_objs[i], 'click',
                function () { Msg.broadcast({ type: 'ClickMapPoint', id: that.myID }, that.myID); }
            );
            }
            that.remove = function () {
                for (var i = 0; i < this.myObjects.length; i++) {
                    this.myObjects[i].setMap(null);
                }
            }

            return that;
        }
        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a Polygon
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Polygon = function (iid, imapobject, data) {
            var that = {};

            that.myID = iid;
            that.myMapObject = imapobject;
            that.myMapObject._addOverlay(that);
            that.myData = data;

            var myCoordinates = [];
            for (var i = 0; i < data.length; i++)
                myCoordinates.push(new google.maps.LatLng(data[i].lattit, data[i].longit));
            var polyOptions = {
                path: myCoordinates,
                strokeColor: "#FF0000",
                strokeOpacity: 0.5,
                strokeWeight: 3,
                fillColor: "#FF0000",
                fillOpacity: 0.15
            }
            that.myObject = new google.maps.Polygon(polyOptions);
            that.myObject.setMap(that.myMapObject.myMap);

            that.remove = function () {
                this.myObject.setMap(null);
            }
            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a set of points
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.PointSet = function (iid, imapobject, iminzoomlevel, bitmapfile, polygon_options) {
            var that = {};

            that.myID = iid;
            that.myMapObject = imapobject;
            that.polygon_options = polygon_options;
            that.minZoomlevel = iminzoomlevel;
            that.myMapObject._addOverlay(that);
            that.myPointSet = [];

            if (bitmapfile.length > 0)
                that.image = new google.maps.MarkerImage(bitmapfile, null, null, new google.maps.Point(10, 10));
            that.visibleUser = true;
            that.visibleZoomlevel = imapobject.myMap.zoom >= iminzoomlevel;
            that._currentVisible = false;

            that.clearPoints = function () {
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++)
                    for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++)
                        this.myPointSet[pointnr].markers[marknr].setMap(null);
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that._handleOnPointClicked = function (pointnr) {
                //alert('clicked point ' + pointnr);
                Msg.broadcast({ type: 'ClickMapPoint', id: this.myID }, this.myPointSet[pointnr].id);
            }

            that._updateVisible = function () {
                var newstatus = (this.visibleUser) && (this.myMapObject.myMap.zoom >= this.minZoomlevel);
                if (newstatus != this._currentVisible) {
                    this._currentVisible = newstatus;
                    for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++) {
                        if (!newstatus)
                            for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++)
                                this.myPointSet[pointnr].markers[marknr].setMap(null);
                        else
                            for (var marknr = 0; marknr < this.myPointSet[pointnr].markers.length; marknr++) {
                                this.myPointSet[pointnr].markers[marknr].setMap(this.myMapObject.myMap);
                            }
                    }
                }
            }

            that.setPoints = function (ipointset, showLabels) {
                this.clearPoints();
                this.myPointSet = ipointset;
                for (var i = 0; i < ipointset.length; i++) {
                    var obj = this;
                    (function (iarg) {//closure because we need persistent counter
                        var pointnr = iarg;
                        var pointInfo = ipointset[pointnr];
                        var markerObject = null;
                        var markerOptions = {
                            position: new google.maps.LatLng(pointInfo.lattit, pointInfo.longit),
                            map: obj.myMapObject.myMap,
                            icon: obj.image
                        }
                        if (pointInfo.title)
                            markerOptions.title = pointInfo.title;
                        if ('styleIcon' in pointInfo) {
                            markerOptions.styleIcon = new StyledMarker.StyledIcon(StyledMarker.StyledIconTypes.MARKER, pointInfo.styleIcon);
                            markerObject = new StyledMarker.StyledMarker(markerOptions);
                        }
                        if (pointInfo.labelName) {
                            var labelColor = "ffffff";
                            if (pointInfo.labelColor)
                                labelColor = pointInfo.labelColor;
                            //markerOptions.styleIcon = new StyledMarker.StyledIcon(StyledMarker.StyledIconTypes.BUBBLE, { color: labelColor, text: pointInfo.labelName });
                            //markerObject = new StyledMarker.StyledMarker(markerOptions);
                        }
                        //!!!                        if (!markerObject)
                        //                            markerObject = new google.maps.Marker(markerOptions);

                        if (obj.myPointSet[pointnr].location_type == 'country') {
                            google_objs = GeoJSON(Countries.geo_json_by_fullname[obj.myPointSet[pointnr].given_name], obj.polygon_options);
                            if (!google_objs[0].error) {
                                obj.myPointSet[pointnr].markers = google_objs;
                                for (var j = 0; j < google_objs.length; j++) {
                                    google.maps.event.addListener(obj.myPointSet[pointnr].markers[j], 'click',
                                   function () { obj._handleOnPointClicked(pointnr); });
                                }
                            } else {
                                console.log(obj.myPointSet[pointnr].given_name);
                                console.log(google_objs);
                            }

                        } else {
                            obj.myPointSet[pointnr].markers = [];
                            if (markerObject != null) {
                                obj.myPointSet[pointnr].markers.push(markerObject);
                                google.maps.event.addListener(obj.myPointSet[pointnr].markers[0], 'click',
                                    function () { obj._handleOnPointClicked(pointnr); }
                                    );
                            }
                        }

                    })(i);
                }
                if (showLabels) {
                    var layouter = GMaps.MapItemLayouter(this.myMapObject, '');
                    for (var i = 0; i < ipointset.length; i++) {
                        var pointInfo = ipointset[i];
                        layouter.addItem(pointInfo.longit, pointInfo.lattit, 150);
                    }
                    layouter.calculatePositions0();
                    for (var i = 0; i < ipointset.length; i++) {
                        var pointInfo = ipointset[i];
                        var dx = layouter.items[i].dx;
                        var dy = layouter.items[i].dy;
                        if ((dx == 0) && (dy == 0)) {
                            dx = 1; dy = 1;
                        }
                        var rd = Math.sqrt(dx * dx + dy * dy);
                        dx *= 30 / rd; dy *= 30 / rd;
                        var label = GMaps.Overlay.Label(this.myMapObject, '', GMaps.Coord(layouter.items[i].longit, layouter.items[i].lattit), dx, -dy, pointInfo.labelName);
                        label.pointID = pointInfo.id;
                        label.setOnClick(function () {
                            Msg.broadcast({ type: 'ClickMapPoint', id: that.myID }, this.pointID);
                        });
                        obj.myPointSet[i].markers.push(label);
                    }

                }
                this._updateVisible();
            }

            that.isInView = function () {
                var bounds = this.myMapObject.myMap.getBounds();
                if (!bounds) return false;
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++)
                    if (!bounds.contains(new google.maps.LatLng(this.myPointSet[pointnr].lattit, this.myPointSet[pointnr].longit)))
                        return false;
                return true;
            }

            that.zoomFit = function (minsize) {
                if (this.myPointSet.length == 0)
                    return;

                var bounds = new google.maps.LatLngBounds();
                for (var pointnr = 0; pointnr < this.myPointSet.length; pointnr++) {
                    bounds.extend(new google.maps.LatLng(this.myPointSet[pointnr].lattit, this.myPointSet[pointnr].longit));
                }
                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var latrange = ne.lat() - sw.lat();
                var minsizearc = minsize / 40000.0 * 360.0;
                if (latrange < minsizearc) {
                    bounds.extend(new google.maps.LatLng(Math.min(89.9, ne.lat() + (minsizearc - latrange) / 2), ne.lng()));
                    bounds.extend(new google.maps.LatLng(Math.max(-89.9, sw.lat() - (minsizearc - latrange) / 2), sw.lng()));
                }
                this.myMapObject.myMap.fitBounds(bounds);
            }


            that.setVisible = function (status) {
                this.visibleUser = status;
                this._updateVisible();
            }


            that.onZoomLevelChanged = function () {
                this._updateVisible();
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Class displaying a set of points as a heatmap
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.PointSetHeatmap = function (imapobject, igradient) {
            var that = {};

            that.myMapObject = imapobject;
            that.myPointSet = [];
            that._myHeatMap = null;
            that.myGradient = igradient;

            that.clearPoints = function () {
                if (that._myHeatMap != null)
                    that._myHeatMap.setMap(null);
                that._myHeatMap = null;
            }

            that.setPoints = function (ipointset) {
                this.clearPoints();

                var heatmapData = [];
                for (var pointnr = 0; pointnr < ipointset.length; pointnr++)
                    heatmapData.push({
                        location: new google.maps.LatLng(pointInfo.lattit, pointInfo.longit),
                        weight: 1
                    });
                that._myHeatMap = new google.maps.visualization.HeatmapLayer({
                    data: heatmapData,
                    dissipating: false,
                    radius: 3.5,
                    opacity: 0.4,
                    maxIntensity: 5,
                    gradient: this.myGradient
                });
                that._myHeatMap.setMap(this.myMapObject.myMap);
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////
        // Base class for a Google Maps overlay
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.Overlay = {};
        GMaps._overlayIDNr = 0;
        GMaps.Overlay._Base = function (imapobject, iid, isSVG) {
            var that = new google.maps.OverlayView();

            that.myMapObject = imapobject;
            if (!iid) {
                GMaps._overlayIDNr++;
                iid = 'GMapOverlay' + GMaps._overlayIDNr;
            }
            that.myID = iid;
            imapobject._addOverlay(that);
            that.setMap(that.myMapObject.myMap);

            //if dist is defined, it converts a distance in km to pixels (approx.)
            that.convCoordToPixels = function (coord, dist) {
                var overlayProjection = this.getProjection();
                var pt = overlayProjection.fromLatLngToDivPixel(coord.toGoogleLatLng());
                if (typeof dist != 'undefined') {
                    var coord2 = GMaps.Coord(coord.longit, coord.lattit - +(dist / 40000.0 * 360));
                    var pt2 = overlayProjection.fromLatLngToDivPixel(coord2.toGoogleLatLng());
                    pt.dist = Math.abs(pt.y - pt2.y);
                }
                return pt;
            }

            that.remove = function () {
                this.setMap(null);
            }



            that.onAdd = function () {
                this.myDiv = document.createElement('div');
                this.myDiv.style.position = 'absolute';
                this.myDiv.style.overflow = 'visible';
                //this.myDiv.style.pointerEvents = 'none';
                var panes = this.getPanes();
                panes.overlayMouseTarget.appendChild(this.myDiv);

                google.maps.event.addDomListener(this.myDiv, 'mouseover', function () { $(this).css('cursor', 'pointer'); });
            }

            that.draw = function () {
                var bb = this.render();
                this.myDiv.style.left = bb.x0 + 'px';
                this.myDiv.style.top = bb.y0 + 'px';
                this.myDiv.style.width = (bb.x1 - bb.x0 + 1) + 'px';
                this.myDiv.style.height = (bb.y1 - bb.y0) + 'px';
            }

            that.onRemove = function () {
                this.myDiv.parentNode.removeChild(this.myDiv);
                this.myDiv = null;
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////
        // Class for a pie chart Google Maps overlay
        //////////////////////////////////////////////////////////////////////////////////////////
        //icentercoord of type GMaps.Coord
        //iradius in km
        //ichart of type DQX.SVG.PieChart

        GMaps.Overlay.PieChart = function (imapobject, iid, icentercoord, iradius, ichart) {
            var that = GMaps.Overlay._Base(imapobject, iid);
            that._centerCoordPieChart = icentercoord;
            that._centerCoord = icentercoord;
            that.myRadius = iradius;
            that.myChart = ichart;
            that.myChart.myCallbackObject = that;
            DQX.ObjectMapper.Add(that);

            that.setOrigCoord = function (coord) {
                that._centerCoord = coord;
            }

            that.render = function () {
                var ps = this.convCoordToPixels(this._centerCoordPieChart, this.myRadius);
                var diskSize = ps.dist;
                var ps0 = this.convCoordToPixels(this._centerCoord, 0);
                var bb = {};
                bb.x0 = Math.min(ps0.x, ps.x - ps.dist);
                bb.y0 = Math.min(ps0.y, ps.y - ps.dist);
                bb.x1 = Math.max(ps0.x, ps.x + ps.dist);
                bb.y1 = Math.max(ps0.y, ps.y + ps.dist);
                var data = '<svg width={w} height={h} style="overflow:visible">'.DQXformat({ w: (bb.x1 - bb.x0), h: (bb.y1 - bb.y0) });
                //data += '<filter id="dropshadow" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="3"/> <!-- stdDeviation is how much to blur --><feOffset dx="2" dy="2" result="offsetblur"/> <!-- how much to offset --><feMerge><feMergeNode/> <!-- this contains the offset blurred image --><feMergeNode in="SourceGraphic"/> <!-- this contains the element that the filter is applied to --></feMerge></filter>';
                data += this.myChart.render(ps.x - bb.x0, ps.y - bb.y0, ps.dist);
                var dfx = ps0.x - ps.x;
                var dfy = ps0.y - ps.y;
                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                if (dst > 2) {
                    var drx = dfx / dst;
                    var dry = dfy / dst;
                    var ps2x = ps.x + ps.dist * drx;
                    var ps2y = ps.y + ps.dist * dry;
                    var wd = diskSize / 10.0;
                    data += '<polygon points="{x1},{y1},{x2},{y2},{x3},{y3}" style="stroke-width: 2px; stroke: rgb(40,40,40); fill:rgb(40,40,40)"/>'.DQXformat({
                        x1: ps0.x - bb.x0,
                        y1: ps0.y - bb.y0,
                        x2: ps2x + wd * dry - bb.x0,
                        y2: ps2y - wd * drx - bb.y0,
                        x3: ps2x - wd * dry - bb.x0,
                        y3: ps2y + wd * drx - bb.y0
                    });
                }
                data += "</svg>";
                this.myDiv.innerHTML = data;
                return bb;
            }

            that.pieClick = function (pienr) {
                //alert('clicked ' + that.myID + ' ' + pienr);
                if (that.onClick)
                    that.onClick(this, pienr);
            }

            return that;
        }

        GMaps.Overlay.Label = function (imapobject, iid, icentercoord, ioffsetX, ioffsetY, itext) {
            var that = GMaps.Overlay._Base(imapobject, iid);
            that._centerCoord = icentercoord;
            that._offsetX = ioffsetX;
            that._offsetY = ioffsetY;
            that._text = itext;
            that._onClickHandler = null;
            DQX.ObjectMapper.Add(that);

            that.setOnClick = function (handler) {
                this._onClickHandler = handler;
            }

            that.render = function () {
                //!!! This does not work properly on non-IE browsers
                // Planned solution:
                //  * Create arrow & label as separate overlays
                //  * confine div boxes to precisely whats needed
                var ps0 = this.convCoordToPixels(this._centerCoord);
                var ps1 = { x: ps0.x + this._offsetX, y: ps0.y + this._offsetY };
                var bb = {};
                bb.x0 = Math.min(ps0.x, ps1.x);
                bb.y0 = Math.min(ps0.y, ps1.y - 20);
                bb.x1 = Math.max(ps0.x, ps1.x);
                bb.y1 = Math.max(ps0.y, ps1.y + 20);

                var dfx = ps1.x - ps0.x;
                var dfy = ps1.y - ps0.y;
                var dst = Math.sqrt(dfx * dfx + dfy * dfy);
                var drx = dfx / dst;
                var dry = dfy / dst;
                var wd = 3.0;


                var data = '<svg style="">';
                data += '<polygon points="{x1},{y1},{x2},{y2},{x3},{y3}" style="stroke-width: 2px; stroke: rgb(40,40,40); fill:rgb(40,40,40)"/>'.DQXformat({
                    x1: ps0.x - bb.x0,
                    y1: ps0.y - bb.y0,
                    x2: ps1.x + wd * dry - bb.x0,
                    y2: ps1.y - wd * drx - bb.y0,
                    x3: ps1.x - wd * dry - bb.x0,
                    y3: ps1.y + wd * drx - bb.y0
                });


                var hH = 9;

                var txt = DocEl.Create('rect');
                txt.addAttribute('x', ps1.x - bb.x0 - hH);
                txt.addAttribute('y', ps1.y - bb.y0 - hH);
                txt.addAttribute('width', 90);
                txt.addAttribute('height', 2 * hH);
                txt.addStyle("fill", "rgb(255,255,128)");
                txt.addStyle("stroke", "black");
                //txt.addStyle("fill-opacity", "0.7");
                //txt.addStyle("stroke-opacity", "0.7");
                //                stroke:pink;stroke-width:5;fill-opacity:0.1;stroke-opacity:0.9"/>

                data += txt.toString();


                var txt = DocEl.Create('text');
                txt.addAttribute('y', ps1.y - bb.y0 + 5);
                txt.addAttribute('font-size', '12');
                txt.addAttribute('fill', 'black');
                if (ps1.x < ps0.x) {
                    txt.addAttribute('text-anchor', 'end');
                    txt.addAttribute('x', ps1.x - bb.x0 + hH - 3);
                } else {
                    txt.addAttribute('x', ps1.x - bb.x0 - hH + 3);
                }
                txt.addElem(this._text);

                data += txt.toString();

                data += "</svg>";
                this.myDiv.innerHTML = data;

                var txt = this.myDiv.getElementsByTagName('text')[0];
                var textLen = txt.getComputedTextLength();

                var rc = this.myDiv.getElementsByTagName('rect')[0];
                var recW = textLen + 10;
                rc.width.baseVal.value = recW;

                if (ps1.x < ps0.x) {
                    txt.x.baseVal.value -= recW - 2 * hH;
                    rc.x.baseVal.value -= recW - 2 * hH;
                }

                if (this._onClickHandler) {
                    $(txt).click($.proxy(that._onClickHandler, that));
                    $(rc).click($.proxy(that._onClickHandler, that));
                }

                bb.x0 = Math.min(bb.x0, ps1.x);
                bb.x1 = Math.max(ps0.x, ps1.x + recW - hH);


                return bb;

            }


            return that;
        }




        //////////////////////////////////////////////////////////////////////////////////////////
        // Class Encapsulating Google Maps view with overlays
        //////////////////////////////////////////////////////////////////////////////////////////

        GMaps.GMap = function (iParentRef, istartcoord, istartzoomlevel) {
            var that = FramePanel(iParentRef);

            that.getRootElem().css('background-color', 'rgb(210,230,255)');

            var styles = [
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [
                { lightness: 100 },
                { visibility: "off" }
              ]
            },
            {
                featureType: "road",
                elementType: "labels",
                stylers: [
                { visibility: "off" }
              ]
            },
            {
                featureType: 'poi',
                elementType: "all",
                stylers: [
                { visibility: "off" }
              ]
            }
            ,
            {
                featureType: 'administrative',
                elementType: "all",
                stylers: [
                { lightness: 25}/*,
            { gamma: "0.25" }*/
            ]
            }
            ];


            var styledMap = new google.maps.StyledMapType(styles, { name: "Simple" });

            var mapoptions = {
                zoom: istartzoomlevel,
                center: new google.maps.LatLng(istartcoord.lattit, istartcoord.longit),
                mapTypeControlOptions: {
                    mapTypeIds: [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.SATELLITE, 'map_style_simple']
                }
            };

            that.myMap = new google.maps.Map(document.getElementById(that.getDivID()), mapoptions);
            that.myMap.mapTypes.set('map_style_simple', styledMap);
            that.myMap.setMapTypeId('map_style_simple');

/*
            //Create base overlay structure
            that.containerOverlay = new google.maps.OverlayView();
            that.containerOverlay.setMap(that.myMap);
            that.overlayDiv = document.createElement('div');
            that.overlayDiv.style.position = 'absolute';
            //that.overlayDiv.style.width = '3000px';
            //that.overlayDiv.style.height = '3000px';
            that.overlayDiv.style.backgroundColor = 'yellow';
            //that.overlayDiv.style.display = 'none';
            //that.overlayDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="display:inline"> <circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"/></svg>';
            that.containerOverlay.onAdd = function () {
                var panes = that.containerOverlay.getPanes();
                panes.overlayMouseTarget.appendChild(that.overlayDiv);
            }
            that.containerOverlay.draw = function (a, b, c) {
                that.overlayDiv.style.left = '0px';
                that.overlayDiv.style.top = '0px';
                var w=$('#'+that.getDivID()).width();
                var h = $('#' + that.getDivID()).width();
                that.overlayDiv.style.width = w + 'px';
                that.overlayDiv.style.height = h + 'px';
            }
*/

            that._myOverlays = [];

            that._addOverlay = function (obj) {
                that._myOverlays.push(obj);
            }

            that.getOverlayCount = function () { return that._myOverlays.length; }

            that.getOverlay = function (nr) {
                return this._myOverlays[nr];
            }

            that.removeOverlay = function (id) {
                for (var i = 0; i < that._myOverlays.length; i++) {
                    if (that._myOverlays[i].myID == id) {
                        that._myOverlays[i].remove();
                        that._myOverlays.splice(i, 1);
                        return;
                    }
                }
            }

            that._handleOnZoomChanged = function () {
                for (var i = 0; i < this._myOverlays.length; i++)
                    if ("onZoomLevelChanged" in this._myOverlays[i])
                        this._myOverlays[i].onZoomLevelChanged();
            }

            google.maps.event.addListener(that.myMap, 'zoom_changed', $.proxy(that._handleOnZoomChanged, that));



            that.handleResize = function () {
                google.maps.event.trigger(this.myMap, 'resize');
            }


            return that;
        }
        return GMaps;
    });

