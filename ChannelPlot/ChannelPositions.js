// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>


define(["require", "DQX/Framework", "DQX/Controls", "DQX/Msg", "DQX/Utils", "DQX/ChannelPlot/ChannelCanvas", "DQX/DataFetcher/DataFetchers"],
    function (require, Framework, Controls, Msg, DQX, ChannelCanvas, DataFetchers) {

        var ChannelPosition = {};

            /*
            iDataFetcher = datafetcher of type 'Curve' providing the position information
             iPositionIDField = field name of the column containing a unique identifier for each position (of type string)
             */
            ChannelPosition.Channel = function (id, iDataFetcher, iPositionIDField) {
                var that = ChannelCanvas.Base(id);
                that.dataFetcher = iDataFetcher;
                that.positionIDField = iPositionIDField;
                that._height = 20;
                that._toolTipHandler = null;
                that._clickHandler = null;
                that.dataFetcher.addFetchColumnActive(that.positionIDField, "String");
                that._selectionQuery = null;

                //Uses a categorical string field in the datafetcher to assign colors to position indicators
                // iStates: map linking field value to DQX.Color instances
                that.makeCategoricalColors = function(iFieldName, iStates) {
                    that._catColorFieldName =  iFieldName;
                    that._catColorStates = iStates;
                    that.dataFetcher.addFetchColumnActive(that._catColorFieldName, "String");
                }

                that.setSelectionStateHandler = function(iSelectionQuery) {
                    that._selectionQuery = iSelectionQuery;
                }

                //Provides a function that will be called when hovering over a position. The return string of this function will be displayed as tooltip
                that.setToolTipHandler = function(handler) {
                    that._toolTipHandler = handler
                }

                //Provides a function that will be called when clicking on a position.
                that.setClickHandler = function(handler) {
                    that._clickHandler = handler
                }

                that._setPlotter = function(iPlotter) {
                    that._myPlotter=iPlotter;
                    iPlotter.addDataFetcher(that.dataFetcher);
                }

                that.draw = function (drawInfo, args) {
                    var PosMin = Math.round((-50 + drawInfo.offsetX) / drawInfo.zoomFactX);
                    var PosMax = Math.round((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX);

                    this.drawStandardGradientCenter(drawInfo, 1);
                    this.drawStandardGradientLeft(drawInfo, 1);
                    this.drawStandardGradientRight(drawInfo, 1);

                    //Draw SNPs
                    var alldataready = this.dataFetcher.IsDataReady(PosMin, PosMax, DataFetchers.RecordCountFetchType.IMMEDIATE);
                    var fetcherror = this.dataFetcher.hasFetchFailed;
                    var points = this.dataFetcher.getColumnPoints(PosMin, PosMax, this.positionIDField);
                    var xvals = points.xVals;
                    var ids = points.YVals;
                    var colorFieldStates = null;
                    if (this._catColorFieldName)
                        colorFieldStates = this.dataFetcher.getColumnPoints(PosMin, PosMax, this._catColorFieldName).YVals;
                    drawInfo.centerContext.fillStyle = DQX.Color(0.7, 0.7, 0.7).toStringCanvas();
                    drawInfo.centerContext.strokeStyle = DQX.Color(0.0, 0.0, 0.0).toString();
                    this._pointsX = [];
                    var pointsX = this._pointsX;
                    this._pointsIndex = [];
                    var pointsIndex = this._pointsIndex;
                    this.startIndex = points.startIndex;

                    var psxLast = null;
                    for (var i = 0; i < xvals.length; i++) {
                        var x = xvals[i];
                        var psx = Math.round(x * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                        var isSelected = false;
                        if (that._selectionQuery)
                            isSelected = that._selectionQuery(ids[i]);
                        if ( (Math.abs(psx-psxLast)>0.9) || (isSelected) ) {
                            pointsX.push(psx); pointsIndex.push(i + points.startIndex);
                            var psy = 4.5;

                            if (isSelected) {
                                drawInfo.centerContext.fillStyle = DQX.Color(1.0, 0.0, 0.0, 0.5).toStringCanvas();
                                drawInfo.centerContext.beginPath();
                                drawInfo.centerContext.moveTo(psx, psy-5);
                                drawInfo.centerContext.lineTo(psx + 4 +4, psy + 8+3);
                                drawInfo.centerContext.lineTo(psx - 4 -5, psy + 8+3);
                                drawInfo.centerContext.closePath();
                                drawInfo.centerContext.fill();
                                drawInfo.centerContext.fillStyle = DQX.Color(0.7, 0.7, 0.7).toStringCanvas();
                            }

                            if (colorFieldStates) {
                                var color = DQX.Color(0.7,0.7,0.7);
                                if (colorFieldStates[i] in that._catColorStates)
                                    color = that._catColorStates[colorFieldStates[i]];
                                drawInfo.centerContext.fillStyle = color.toStringCanvas();
                            }
                            drawInfo.centerContext.beginPath();
                            drawInfo.centerContext.moveTo(psx, psy);
                            drawInfo.centerContext.lineTo(psx + 4, psy + 8);
                            drawInfo.centerContext.lineTo(psx - 4, psy + 8);
                            drawInfo.centerContext.closePath();
                            drawInfo.centerContext.fill();
                            drawInfo.centerContext.stroke();


                            psxLast = psx;
                        }
                    }

                    if ((!alldataready) && (!fetcherror)) this.drawFetchBusyMessage(drawInfo);
                    if (fetcherror) this.drawFetchFailedMessage(drawInfo);

                    this.drawMark(drawInfo);
                    this.drawXScale(drawInfo);
                    this.drawTitle(drawInfo);
                };

                that.getToolTipInfo = function (px, py) {
                    if ((py >= 0) && (py <= 20)) {
                        var pointsX = this._pointsX;
                        var pointsIndex = this._pointsIndex;
                        var mindst = 12;
                        var bestpt = -1;
                        var bestpx = null;
                        if (!pointsX)
                            return;
                        for (var i = 0; i < pointsX.length; i++)
                            if (Math.abs(px - pointsX[i]) <= mindst) {
                                mindst = Math.abs(px - pointsX[i]);
                                bestpt = pointsIndex[i];
                                bestpx = pointsX[i];
                            }
                        if (bestpt >= 0) {
                            var info = { ID:'pos'+bestpt };
                            info.px = bestpx;
                            info.py = 13;
                            info.positionID = this.dataFetcher.getColumnPoint(bestpt, that.positionIDField);
                            info.content=info.positionID;
                            if (that._toolTipHandler)
                                info.content = that._toolTipHandler(info.positionID,bestpt);
                            if (that._clickHandler)
                                info.showPointer = true;
                            return info;
                        }
                    }
                    return null;
                }

                that.handleMouseClicked = function (px, py, area, params) {
                    var tooltipInfo = that.getToolTipInfo(px, py);
                    if (tooltipInfo && that._clickHandler)
                        that._clickHandler(tooltipInfo.positionID);
                }


                return that;
            };


        return ChannelPosition;
    });