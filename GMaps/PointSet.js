// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>


define(["jquery", "DQX/data/countries", "DQX/lib/geo_json", "DQX/lib/StyledMarker", "DQX/Msg", "DQX/DocEl", "DQX/Utils", "DQX/FramePanel", "DQX/Map", "DQX/GMaps/CanvasLayer"],
    function ($, Countries, GeoJSON, StyledMarker, Msg, DocEl, DQX, FramePanel, Map, CanvasLayer) {

        var PointSet = {};


        PointSet.Create = function (imapobject, settings) {
            var that = {};
            that.myMapObject = imapobject;
            that.myPointSet = [];
            that.pointSize = 6;
            that.pieChartSize = 30;
            that.opacity = 0.75;
            that.pointShape = 0;
            that.aggregatePieChart = true;
            that.maxAggrCount = 0;
            that.colorMap = DQX.standardColors;

            var canvasLayerOptions = {
                map: that.myMapObject.myMap,
                resizeHandler: function() { that._resize() },
                animate: false,
                updateHandler: function() { that.draw() }
            };
            that.canvasLayer = new CanvasLayer.CanvasLayer(canvasLayerOptions);
            that.context = that.canvasLayer.canvas.getContext('2d');

            that.googleEventListeners = [];

            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'click', function(event) {
                that.onMouseClick(event);
            }));
            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'mousemove', function(event) {
                that.onMouseMove(event);
            }));

            that.googleEventListeners.push(google.maps.event.addListener(that.myMapObject.myMap, 'mouseout', function(event) {
                that.removeTooltip();
            }));



            that.onCloseCustom = function() {
                $.each(that.googleEventListeners, function(idx, evid) {
                    google.maps.event.removeListener(evid);
                });
            };

            that.setColorMap = function(mp) {
                that.colorMap = mp;
            };

            that.setPointStyle = function(sett) {
                that.opacity = sett.opacity;
                that.pointSize = sett.pointSize;
                that.pointShape = -1;
                if (sett.pointShape == 'rectangle')
                    that.pointShape = 0;
                if (sett.pointShape == 'circle')
                    that.pointShape = 1;
                if (sett.pointShape == 'fuzzy')
                    that.pointShape = 2;
                if (sett.pointShape == 'marker')
                    that.pointShape = 3;
                if (that.pointShape < 0)
                    DQX.reportError('Invalid point shape');
                that.pieChartSize = sett.aggrSize;
                that.aggregatePieChart = true;
                if (sett.aggregateStyle == 'cluster')
                    that.aggregatePieChart = false;

                that.usePiechartOffset = !!(sett.usePiechartOffset);
            }

            that._resize = function() {
            }

            // argument: Google latlong object
            that.findPointAtPosition = function(latLng) {
                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return null;
                if ((!that.canvasLayer) || (!that.canvasLayer.getTopLeft()))
                    return;
                var topLeftPoint = that.canvasLayer.getTopLeft();
                if (!topLeftPoint)
                    return null;
                var offset = mapProjection.fromLatLngToPoint(topLeftPoint);
                var zoomF = Math.pow(2, that.myMapObject.myMap.zoom);
                var mousept = mapProjection.fromLatLngToPoint(latLng);
                mousept.x = (mousept.x-offset.x)*zoomF;
                mousept.y = (mousept.y-offset.y)*zoomF;
                var pts = (that.pointSize*that.pointSize)*1.0;
                var mindst = Math.max(5,pts/2);
                var matchpoint = null;
                $.each(that.myPointSet, function (idx, point) {
                    if ( (!that.isPointFiltered(point)) && (point.pt) && ((!point.isAggregated) || (!that.aggregatePieChart) ) ) {
                        var dst = Math.sqrt(Math.pow(mousept.x-point.pt.x,2) + Math.pow(mousept.y-point.pt.y,2));
                        if (dst<=mindst) {
                            mindst = dst;
                            matchpoint = point;
                        }
                    }
                });
                return matchpoint;
            }

            // argument: Google latlong object
            that.findPieChartAtPosition = function(latLng) {
                if ((!that.aggregatePieChart) || (!that.aggregators))
                    return;
                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return null;
                if ((!that.canvasLayer) || (!that.canvasLayer.getTopLeft()))
                    return;
                var offset = mapProjection.fromLatLngToPoint(that.canvasLayer.getTopLeft());
                var zoomF = Math.pow(2, that.myMapObject.myMap.zoom);
                var mousept = mapProjection.fromLatLngToPoint(latLng);
                mousept.x = (mousept.x-offset.x)*zoomF;
                mousept.y = (mousept.y-offset.y)*zoomF;
                var matchAggr = null;
                $.each(that.aggregators, function (idx, aggr) {
                    if (aggr.pt) {
                        var dst = Math.sqrt(Math.pow(mousept.x-aggr.pt.x,2) + Math.pow(mousept.y-aggr.pt.y,2));
                        if (dst<=aggr.rd)
                            matchAggr = aggr;
                    }
                });
                return matchAggr;
            }

            that.removeTooltip = function() {
                if (that.toolTipShowingID) {
                    $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                    that.toolTipShowingID = null;
                }
            }

            that.showTooltip = function(event, point) {
                var pointID = point.id;
                if (that.toolTipShowingID != pointID) {
                    if (that.toolTipShowingID)
                        that.removeTooltip();
                    that.toolTipShowingID = pointID;
                    var content =point.id + '<br>';
                    content += point.longit.toFixed(5) + ', ' + point.lattit.toFixed(5) + '<br>';
                    if (that.pointSettings.catData)
                        content += point.catName;
                    if (that.pointSettings.numData)
                        content += point.numProp;
                    var tooltip = DocEl.Div();
                    tooltip.setCssClass("DQXChannelToolTip");
                    tooltip.addStyle("position", "absolute");
                    //return px + $(this.getCanvasElement('center')).offset().left;

                    var offsetX = $('#'+that.myMapObject.getID()).offset().left;
                    var offsetY = $('#'+that.myMapObject.getID()).offset().top;

                    tooltip.addStyle("left", (offsetX + event.pixel.x + 10) + 'px');
                    tooltip.addStyle("top", (offsetY + event.pixel.y + 10) + 'px');
                    tooltip.addStyle("z-index", '9999999');
                    tooltip.addElem(content);
                    $('#DQXUtilContainer').append(tooltip.toString());
                }
            }

            that.onMouseMove = function(event) {
                if (that.myMapObject.isSelecting())
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint) {
                    that.myMapObject.myMap.set('draggableCursor', 'pointer');
                    that.showTooltip(event, matchpoint);
                    return;
                }
                else
                    that.removeTooltip();
                if (that.aggregatePieChart && (that.aggregators)) {
                    var matchaggr = that.findPieChartAtPosition(event.latLng);
                    if (matchaggr) {
                        that.myMapObject.myMap.set('draggableCursor', 'pointer');
                        return;
                    }
                }
                that.myMapObject.myMap.set('draggableCursor', 'default');
            }

            that.onMouseClick = function(event) {
                if (that.myMapObject.isSelecting())
                    return;
                var matchpoint = that.findPointAtPosition(event.latLng);
                if (matchpoint && that._pointClickCallBack) {
                    that._pointClickCallBack(matchpoint.id);
                    return;
                }
                if (that.aggregatePieChart && that._pieChartClickCallBack && (that.aggregators)) {
                    var matchaggr = that.findPieChartAtPosition(event.latLng);
                    if (matchaggr) {
                        that._pieChartClickCallBack(matchaggr);
                        return;
                    }
                }
            }

            that.draw = function() {


                //Prepare color category strings
                var colorStrings0 = [];
                var colorStrings = [];
                var colorStrings2 = [];
                $.each(that.colorMap, function(idx, color) {
                    colorStrings0.push(color.changeOpacity(that.opacity).toStringCanvas());
                    colorStrings.push(color.changeOpacity(that.opacity).toStringCanvas());
                    colorStrings2.push(color.changeOpacity(0).toStringCanvas());
                });

                var canvasWidth = that.canvasLayer.canvas.width;
                var canvasHeight = that.canvasLayer.canvas.height;
                var ctx = that.context;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);

                if ((!that.myPointSet) || (that.myPointSet.length == 0))
                    return;

                ctx.fillStyle = 'rgba(0, 128, 0, 0.5)';

                var mapProjection = that.myMapObject.myMap.getProjection();
                if (!mapProjection)
                    return;

                ctx.setTransform(1, 0, 0, 1, 0, 0);

                // scale is just 2^zoom
                var zoomF = Math.pow(2, that.myMapObject.myMap.zoom);
                var pts = (that.pointSize*that.pointSize)*1.0;
                var ptso = pts/2.0;

                var drawPieChartSize = that.pieChartSize;

                if ((!that.canvasLayer) || (!that.canvasLayer.getTopLeft()))
                    return;
                var offset = mapProjection.fromLatLngToPoint(that.canvasLayer.getTopLeft());

                var hasCategoricalProperty = that.pointSettings.catData;
                var hasNumericalProperty = that.pointSettings.numData;

                // Draw pie charts
                if (that.aggregatePieChart && (that.aggregators)) {

                    if (that.usePiechartOffset) {
                        var layouter = Map.MapItemLayouter(that.myMapObject,'',100/zoomF);
                        $.each(that.aggregators, function(idx, aggr) {
                            var rd = Math.sqrt(aggr.totCount*1.0/that.maxAggrCount) * that.pieChartSize;
                            layouter.addItem(aggr.longit0, aggr.lattit0, 2.5*rd);
                        });
                        layouter.calculatePositions();
                        $.each(that.aggregators, function(idx, aggr) {
                            aggr.longit = layouter.items[idx].longit2;
                            aggr.lattit = layouter.items[idx].lattit2;
                        });
                    }
                    else {
                        $.each(that.aggregators, function(idx, aggr) {
                            aggr.longit = aggr.longit0;
                            aggr.lattit = aggr.lattit0;
                        });
                    }


                    $.each(that.aggregators, function(idx, aggr) {
                        var pt0 = mapProjection.fromLatLngToPoint(new google.maps.LatLng(aggr.lattit0, aggr.longit0));
                        pt0.x = (pt0.x-offset.x)*zoomF;
                        pt0.y = (pt0.y-offset.y)*zoomF;
                        var pt = mapProjection.fromLatLngToPoint(new google.maps.LatLng(aggr.lattit, aggr.longit));
                        pt.x = (pt.x-offset.x)*zoomF;
                        pt.y = (pt.y-offset.y)*zoomF;
                        aggr.pt = pt;
                        var rd = Math.sqrt(aggr.totCount*1.0/that.maxAggrCount) * drawPieChartSize;
                        aggr.rd = rd;
                        var incrCount = 0;
                        var prevAng = 0;
                        if (that.usePiechartOffset) {
                            var p_dx = pt.x-pt0.x;
                            var p_dy = pt.y-pt0.y;
                            var p_w = 4;
                            var p_offset = Math.sqrt(p_dx*p_dx + p_dy*p_dy);
                            if (p_offset>0) {
                                p_dx /= p_offset;
                                p_dy /= p_offset;
                                var p1x = pt.x - rd*p_dx;
                                var p1y = pt.y - rd*p_dy;
                                ctx.strokeStyle=DQX.Color(0,0,0,0.5+0.5*that.opacity).toStringCanvas();
                                ctx.fillStyle=DQX.Color(0,0,0,0.5*that.opacity).toStringCanvas();
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.moveTo(pt0.x, pt0.y);
                                ctx.lineTo(p1x-p_w*p_dy, p1y+p_w*p_dx);
                                ctx.lineTo(p1x+p_w*p_dy, p1y-p_w*p_dx);
                                ctx.closePath();
                                ctx.stroke();
                                ctx.fill();
                            }
                        }
                        if (!hasNumericalProperty) {
                            $.each(aggr.catsCount, function(catNr, count) {
                                ctx.fillStyle = colorStrings0[catNr];
                                incrCount += count;
                                var ang = incrCount*1.0/aggr.totCount * 2 * Math.PI;
                                ctx.beginPath();
                                ctx.moveTo(pt.x, pt.y);
                                ctx.arc(pt.x, pt.y, rd, prevAng, ang, false);
                                ctx.lineTo(pt.x, pt.y);
                                ctx.closePath();
                                ctx.fill();
                                prevAng = ang;
                            });
                        }
                        else {
                            if (aggr.numPropFracs.length > 0) {
                                var intervalStartFrac = aggr.numPropFracs[0];
                                var intervalStartAng = 0;
                                var intervalEndFrac = null;
                                var intervalEndAng = null;
                                var valCount = aggr.numPropFracs.length;

                                var _drawFracPie = function() {
                                    if (intervalEndAng <= intervalStartAng) return;
                                    var intervalMidFrac = (intervalStartFrac+intervalEndFrac)/2;
                                    ctx.fillStyle = DQX.HSL2Color(0.5-intervalMidFrac*0.75,1,0.5).changeOpacity(that.opacity).toStringCanvas();
                                    ctx.beginPath();
                                    ctx.moveTo(pt.x, pt.y);
                                    ctx.arc(pt.x, pt.y, rd, intervalStartAng, intervalEndAng + (intervalEndAng-intervalStartAng)*0.05, false);
                                    ctx.lineTo(pt.x, pt.y);
                                    ctx.closePath();
                                    ctx.fill();
                                };

                                for (var ptnr=0; ptnr<valCount; ptnr++) {
                                    intervalEndFrac = aggr.numPropFracs[ptnr];
                                    intervalEndAng = (ptnr+1.0)/valCount * 2 * Math.PI;
                                    if (intervalEndFrac-intervalStartFrac>0.0025) {
                                        _drawFracPie();
                                        intervalStartFrac = intervalEndFrac;
                                        intervalStartAng = intervalEndAng;
                                    }
                                }
                                _drawFracPie();
                            }
                        }
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.arc(pt.x, pt.y, rd, 0, 2 * Math.PI, false);
                        ctx.closePath();
                        ctx.stroke();
                        if (aggr.selCount>0) {
                            ctx.lineWidth = 5;
                            ctx.beginPath();
                            ctx.arc(pt.x, pt.y, rd, 0, aggr.selCount*1.0 / aggr.totCount * 2 * Math.PI, false);
                            ctx.stroke();
                        }
                    });
                }

                var selptsx = [];
                var selptsy = [];

                // Draw individual points
                $.each(that.myPointSet, function (idx, point) {
                    if ( (!that.isPointFiltered(point)) && ((!point.isAggregated) || (!that.aggregatePieChart) ) ) {
                        var pt = mapProjection.fromLatLngToPoint(new google.maps.LatLng(point.lattit, point.longit));
                        point.pt = pt;
                        if (hasNumericalProperty)
                            ctx.fillStyle = DQX.HSL2Color(0.5-point.numPropFrac*0.75,1,0.5).changeOpacity(that.opacity).toStringCanvas();
                        else {
                            ctx.fillStyle = colorStrings[point.catNr];
                        }

                        pt.x = (pt.x-offset.x)*zoomF;
                        pt.y = (pt.y-offset.y)*zoomF;

                        pt.x += point.offsetX * drawPieChartSize;
                        pt.y += point.offsetY * drawPieChartSize;

                        if (that.pointShape == 0) {
                            ctx.fillRect(pt.x-ptso, pt.y-ptso, pts, pts);
                        }
                        if (that.pointShape == 1) {
                            ctx.beginPath();
                            ctx.moveTo(pt.x, pt.y);//Note: this seems to be necessary to avoid hollow circles if drawn very small
                            ctx.arc(pt.x, pt.y, ptso, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                        }
                        if (that.pointShape == 3) {
                            ctx.strokeStyle='rgb0(0,0,0)';
                            ctx.beginPath();
                            ctx.moveTo(pt.x, pt.y);//Note: this seems to be necessary to avoid hollow circles if drawn very small
                            ctx.arc(pt.x, pt.y-ptso, 0.4*ptso, Math.PI*0.9, 2.1*Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                        }
                        if (that.pointShape == 2) {
                            var grd=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,ptso);
                            if (hasNumericalProperty) {
                                var cl = DQX.HSL2Color(0.5-point.numPropFrac*0.75,1,0.5).changeOpacity(that.opacity);
                                grd.addColorStop(0, cl.toStringCanvas());
                                grd.addColorStop(1, cl.changeOpacity(0).toStringCanvas());
                            }
                            else {
                                grd.addColorStop(0,colorStrings[point.catNr]);
                                grd.addColorStop(1,colorStrings2[point.catNr]);
                            }
                            ctx.fillStyle = grd;
                            ctx.beginPath();
                            ctx.moveTo(pt.x, pt.y);//Note: this seems to be necessary to avoid hollow circles if drawn very small
                            ctx.arc(pt.x, pt.y, ptso, 0, 2 * Math.PI, false);
                            ctx.closePath();
                            ctx.fill();
                        }

                        if (point.sel) {
                            selptsx.push(pt.x);
                            selptsy.push(pt.y);
                        }
                    }
                });

                ctx.lineWidth = 1;
                ctx.strokeStyle=DQX.Color(0,0,0,0.5+0.5*that.opacity).toStringCanvas();
                for (var i=0; i<selptsx.length; i++) {
                    ctx.beginPath();
                    ctx.arc(selptsx[i], selptsy[i], ptso+2, 0, 2 * Math.PI, false);
                    ctx.closePath();
                    ctx.stroke();
                }


            }


            that.clearPoints = function () {
                this.myPointSet = [];
            }

            that.remove = function () {
                this.clearPoints();
            }

            that.setPointClickCallBack = function(handlerPoint, handlerPieChart) {
                that._pointClickCallBack = handlerPoint;
                that._pieChartClickCallBack = handlerPieChart;
            }

            that._pointFilters = {};

            // Define a filter step for the map points
            that.setPointFilter = function(filterID, filterFunction) {
                that._pointFilters[filterID] = filterFunction;
            }

            that.isPointFiltered = function(point) {
                var filtered = false
                $.each(that._pointFilters, function(id, filter) {
                    if (filter)
                        if (filter(point))
                            filtered = true;
                });
                return filtered;
            }


            that.setPoints = function (ipointset, ipointSettings) {
                that.pointSettings = ipointSettings;

                function normRand() {
                    var x1, x2, rad;

                    do {
                        x1 = 2 * Math.random() - 1;
                        x2 = 2 * Math.random() - 1;
                        rad = x1 * x1 + x2 * x2;
                    } while(rad >= 1 || rad == 0);

                    var c = Math.sqrt(-2 * Math.log(rad) / rad);

                    return x1 * c;
                };
                that.myPointSet = ipointset;
                var pointMap = {}
                $.each(that.myPointSet, function(idx, point) {
                    var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                    if (pointMap[id]) {
                        var rd = Math.sqrt(pointMap[id]/1000);
                        point.offsetX = normRand() * rd;
                        point.offsetY = normRand() * rd;
                        pointMap[id] += 1;
                    }
                    else {
                        point.offsetX = 0;
                        point.offsetY = 0;
                        pointMap[id] = 1;
                    }
                });
                that.aggregators = [];
                that.aggregatorMap = {};
                $.each(pointMap, function(key, val) {
                    if (val>1) {
                        var aggr = {
                            longit: 0,
                            lattit: 0,
                            totCount: 0,
                            catsCount: [],
                            numPropFracs: []
                        };
                        that.aggregators.push(aggr);
                        that.aggregatorMap[key] = aggr;
                    }
                });
                $.each(that.myPointSet, function(idx, point) {
                    if (!that.isPointFiltered(point)) {
                        var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                        point.isAggregated = !!that.aggregatorMap[id];
                        if (point.isAggregated) {
                            point.aggregid = id;
                            var aggr = that.aggregatorMap[id];
                            aggr.numPropFracs.push(point.numPropFrac);
                            aggr.longit = point.longit;
                            aggr.lattit = point.lattit;
                            aggr.longit0 = point.longit;
                            aggr.lattit0 = point.lattit;
                            aggr.totCount += 1;
                            while (aggr.catsCount.length<=point.catNr)
                                aggr.catsCount.push(0);
                            aggr.catsCount[point.catNr] += 1;
                        }
                    }
                });

                $.each(that.aggregators, function(idx, aggr) {
                    that.maxAggrCount = Math.max(that.maxAggrCount, aggr.totCount);
                    aggr.numPropFracs.sort();
                });

                that.countAggregateSelection();

            };

            that.countAggregateSelection = function() {
                $.each(that.aggregators, function(idx, aggr) {
                    aggr.selCount = 0;
                });
                $.each(that.myPointSet, function(idx, point) {
                    var id = Math.round(point.lattit*10000).toString()+'_'+Math.round(point.longit*10000).toString();
                    point.isAggregated = !!that.aggregatorMap[id];
                    if (point.isAggregated && point.sel)
                        that.aggregatorMap[point.aggregid].selCount += 1;
                });

            }

            that.updateSelection = function() {
                that.countAggregateSelection();
                that.draw();
            };


            that.zoomFit = function (minsize) {
                if (that.myPointSet.length == 0)
                    return;
                var bounds = new google.maps.LatLngBounds();
                $.each(that.myPointSet, function(idx, point) {
                    bounds.extend(new google.maps.LatLng(point.lattit, point.longit));
                });

                var ne = bounds.getNorthEast();
                var sw = bounds.getSouthWest();
                var latrange = ne.lat() - sw.lat();
                var minsizearc = minsize / 40000.0 * 360.0;
                if (latrange < minsizearc) {
                    bounds.extend(new google.maps.LatLng(Math.min(89.9, ne.lat() + (minsizearc - latrange) / 2), ne.lng()));
                    bounds.extend(new google.maps.LatLng(Math.max(-89.9, sw.lat() - (minsizearc - latrange) / 2), sw.lng()));
                }
                that.myMapObject.myMap.fitBounds(bounds);
            }


            return that;
        }







        return PointSet;
    });


