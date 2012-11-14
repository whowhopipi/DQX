﻿define(["jquery", "DQX/DocEl", "DQX/Msg"],
    function ($, DocEl, Msg, Scroller) {
        var ChannelCanvas = {};



        ChannelCanvas.Base = function (id) {
            if (!id) throw "No channel ID provided";
            var that = {};
            that._myID = id;
            that._height = 120;
            that._title = '';
            that._subTitle = '';
            that._toolTipInfo = { ID: null };

            that._isVisible = true;
            that.canHide = true;

            that.getID = function () { return that._myID; }

            that.getVisible = function () { return this._isVisible; }

            that._setVisible = function (newStatus) {
                if (!newStatus) {
                    if (this._isOnTopPart) throw "Invalid action";
                    if (!this.canHide) throw "Channel cannot be hidden";
                }
                this._isVisible = newStatus;
                this._updateVisibility();
            }

            that._updateVisibility = function () {
                if (!this._isVisible)
                    $('#' + this.getCanvasID('wrapper')).hide();
                else
                    $('#' + this.getCanvasID('wrapper')).show();
            }


            that.getMyPlotter = function () {
                if (!this._myPlotter) throw "Channel is not yet associated to a plotter";
                return this._myPlotter;
            }
            that.getHeight = function () { return this._height; }
            that.setHeight = function (vl) { this._height = vl; }

            that.setTitle = function (ititle) {
                this._title = ititle;
            }
            that.setSubTitle = function (isubtitle) {
                this._subTitle = isubtitle;
            }

            that.getCanvasID = function (ext) {
                return this.getMyPlotter().getSubID() + '_channel_' + this._myID + '_' + ext;
            }

            that.getCenterElementID = function (ext) {
                return this.getCanvasID('center');
            }

            that.getCanvasElement = function (ext) {
                return $("#" + this.getCanvasID(ext))[0];
            }

            that.posXCenterCanvas2Screen = function (px) {
                return px + $(this.getCanvasElement('center')).offset().left;
            }

            that.posYCenterCanvas2Screen = function (py) {
                return py + $(this.getCanvasElement('center')).offset().top;
            }


            that.renderHtml = function () {
                var wrapper = DocEl.Div({ id: this.getCanvasID('wrapper') });
                wrapper.addStyle("white-space", "nowrap").addStyle("overflow", "hidden");
                var elemLeft = DocEl.Create('canvas', { id: this.getCanvasID('left'), parent: wrapper });
                elemLeft.addAttribute("width", this.getMyPlotter().getLeftWidth());
                elemLeft.addAttribute("height", this._height);
                elemLeft.addStyle('display', 'inline-block');
                elemLeft.setWidthPx(this.getMyPlotter().getLeftWidth()).setHeightPx(that._height);
                var elemCenter = DocEl.Create('canvas', { id: this.getCanvasID('center'), parent: wrapper });
                elemCenter.setCssClass('DQXChannelPlotChannelCenter');
                elemCenter.addAttribute("height", that._height);
                elemCenter.addStyle('display', 'inline-block');
                elemCenter.setWidthPx(10).setHeightPx(that._height);
                var elemRight = DocEl.Create('canvas', { id: this.getCanvasID('right'), parent: wrapper });
                elemRight.addAttribute("width", this.getMyPlotter().getRightWidth());
                elemRight.addAttribute("height", this._height);
                elemRight.addStyle('display', 'inline-block');
                elemRight.setWidthPx(this.getMyPlotter().getRightWidth()).setHeightPx(that._height);
                return wrapper.toString();
            }

            that.postCreateHtml = function () {
                $('#' + this.getCanvasID('center')).click($.proxy(that._onMouseClick, that));
                $('#' + this.getCanvasID('center')).mousedown($.proxy(that._onMouseDown, that));
                $('#' + this.getCanvasID('center')).mousemove($.proxy(that._onMouseMove, that));
                $('#' + this.getCanvasID('center')).mouseenter($.proxy(that._onMouseEnter, that));
                $('#' + this.getCanvasID('center')).mouseleave($.proxy(that._onMouseLeave, that));
                this._updateVisibility();
            }

            that.handleResizeX = function (width) {
                var w2 = width - this.getMyPlotter().getLeftWidth() - this.getMyPlotter().getRightWidth();
                $('#' + this.getCanvasID('center')).width(w2);
                this.getCanvasElement('center').width = w2;
            }


            that._onMouseClick = function (ev) {
                if (!this.getMyPlotter()._hasMouseMoved) {
                    var px = this.getEventPosX(ev);
                    var py = this.getEventPosY(ev);
                    this.handleMouseClicked(px, py);
                }

            }

            that._onMouseDown = function (ev) {
                $(document).bind("mouseup.ChannelCanvas", $.proxy(that._onMouseDragUp, that));
                $(document).bind("mousemove.ChannelCanvas", $.proxy(that._onMouseDragMove, that));
                this.getMyPlotter().handleMouseDown(that, ev, { x: this.getEventPosX(ev), y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragUp = function (ev) {
                $(document).unbind("mouseup.ChannelCanvas");
                $(document).unbind("mousemove.ChannelCanvas");
                this.getMyPlotter().handleMouseUp(that, ev, { x: this.getEventPosX(ev), y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragMove = function (ev) {
                this.getMyPlotter().handleMouseMove(that, ev, { x: this.getEventPosX(ev), y: this.getEventPosY(ev) });
                ev.returnValue = false;
                return false;
            }


            //Returns the position X coordinate of an event, relative to the center canvas element
            that.getEventPosX = function (ev) {
                return ev.pageX - $(this.getCanvasElement('center')).offset().left;
            }

            //Returns the position Y coordinate of an event, relative to the center canvas element
            that.getEventPosY = function (ev) {
                return ev.pageY - $(this.getCanvasElement('center')).offset().top;
            }


            that._onMouseEnter = function (ev) {
            }

            that._onMouseLeave = function (ev) {
                this.hideToolTip();
            }

            that.handleMouseClicked = function(px, py) {
            }


            that.getToolTipInfo = function (px, py) {
                return null;
            }

            that._onMouseMove = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                var newToolTipInfo = this.getToolTipInfo(px, py);
                if (newToolTipInfo) {
                    if (this._toolTipInfo.ID != newToolTipInfo.ID) {
                        this.hideToolTip();
                        this._toolTipInfo = newToolTipInfo;
                        var tooltip = DocEl.Div();
                        tooltip.setCssClass("DQXChannelToolTip");
                        tooltip.addStyle("position", "absolute");
                        tooltip.addStyle("left", (this.posXCenterCanvas2Screen(this._toolTipInfo.px) + 10) + 'px');
                        tooltip.addStyle("top", (this.posYCenterCanvas2Screen(this._toolTipInfo.py) + 10) + 'px');
                        tooltip.addElem(this._toolTipInfo.content);
                        $('#DQXUtilContainer').append(tooltip.toString());
                        if (this._toolTipInfo.highlightPoint) {
                            var tooltip = DocEl.Div();
                            tooltip.setCssClass("DQXChannelToolTipHighlightPoint");
                            tooltip.addStyle("position", "absolute");
                            tooltip.addStyle("left", (this.posXCenterCanvas2Screen(this._toolTipInfo.px) - 5) + 'px');
                            tooltip.addStyle("top", (this.posYCenterCanvas2Screen(this._toolTipInfo.py) - 5) + 'px');
                            $('#DQXUtilContainer').append(tooltip.toString());
                        }
                    }
                }
                else
                    this.hideToolTip();
            }

            that.hideToolTip = function () {
                this._toolTipInfo.ID = null;
                $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                $('#DQXUtilContainer').find('.DQXChannelToolTipHighlightPoint').remove();
            }


            that.drawStandardGradientCenter = function (drawInfo, fc) {
                var backgrad = drawInfo.centerContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, DQX.Color(fc, fc, fc));
                backgrad.addColorStop(1, DQX.Color(0.8 * fc, 0.8 * fc, 0.8 * fc));
                drawInfo.centerContext.fillStyle = backgrad;
                drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, drawInfo.sizeY);
                drawInfo.centerContext.fillStyle = DQX.Color(0.5 * fc, 0.5 * fc, 0.5 * fc).toString();
                drawInfo.centerContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeCenterX, 1);
            }

            that.drawStandardGradientLeft = function (drawInfo, fc) {
                var backgrad = drawInfo.leftContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, DQX.Color(0.9 * fc, 0.9 * fc, 0.9 * fc));
                backgrad.addColorStop(1, DQX.Color(0.7 * fc, 0.7 * fc, 0.7 * fc));
                drawInfo.leftContext.fillStyle = backgrad;
                drawInfo.leftContext.fillRect(0, 0, drawInfo.sizeLeftX, drawInfo.sizeY);
                drawInfo.leftContext.fillStyle = DQX.Color(0.4 * fc, 0.4 * fc, 0.4 * fc).toString();
                drawInfo.leftContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeLeftX, 1);
            }

            that.drawStandardGradientRight = function (drawInfo, fc) {
                if (drawInfo.sizeRightX > 2) {
                    var backgrad = drawInfo.rightContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                    backgrad.addColorStop(0, DQX.Color(0.9 * fc, 0.9 * fc, 0.9 * fc));
                    backgrad.addColorStop(1, DQX.Color(0.7 * fc, 0.7 * fc, 0.7 * fc));
                    drawInfo.rightContext.fillStyle = backgrad;
                    drawInfo.rightContext.fillRect(0, 0, drawInfo.sizeRightX, drawInfo.sizeY);
                    drawInfo.rightContext.fillStyle = DQX.Color(0.4 * fc, 0.4 * fc, 0.4 * fc).toString();
                    drawInfo.rightContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeRightX, 1);
                }
            }

            //Draws a message in the center panel of the channel
            that.drawMessage = function (drawInfo, txt1, txt2) {
                drawInfo.centerContext.fillStyle = "black";
                drawInfo.centerContext.globalAlpha = 0.2;
                drawInfo.centerContext.fillRect(0, drawInfo.PosY - drawInfo.sizeY, drawInfo.sizeCenterX, drawInfo.sizeY);
                drawInfo.centerContext.globalAlpha = 1.0;
                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.globalAlpha = 0.2;
                drawInfo.leftContext.fillRect(0, drawInfo.PosY - drawInfo.sizeY, drawInfo.sizeLeftX, drawInfo.sizeY);
                drawInfo.leftContext.globalAlpha = 1.0;
                drawInfo.centerContext.fillStyle = "black";
                drawInfo.centerContext.font = '25px sans-serif';
                drawInfo.centerContext.textBaseline = 'bottom';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.globalAlpha = 0.6;
                drawInfo.centerContext.fillText(txt1, drawInfo.sizeCenterX / 2, drawInfo.sizeY / 2 + 0);
                if (txt2) {
                    drawInfo.centerContext.fillText(txt2, drawInfo.sizeCenterX / 2, drawInfo.sizeY / 2 + 27);
                }
                drawInfo.centerContext.globalAlpha = 1.0;
            }

            that.drawFetchBusyMessage = function (drawInfo) {
                drawInfo.centerContext.fillStyle = "rgb(0,192,0)";
                drawInfo.centerContext.font = '25px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.fillText("Fetching data...", drawInfo.sizeCenterX / 2, 5);
            }

            that.drawFetchFailedMessage = function (drawInfo) {
                drawInfo.centerContext.fillStyle = "rgb(255,0,0)";
                drawInfo.centerContext.font = '25px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.fillText("Fetch failed !", drawInfo.sizeCenterX / 2, 5);
            }

            //Draws a vertical scale in the left panel of the channel
            that.drawVertScale = function (drawInfo, minvl, maxvl) {
                var jumps = DQX.DrawUtil.getScaleJump((maxvl - minvl) / 15);

                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.font = '10px sans-serif';
                drawInfo.leftContext.textBaseline = 'bottom';
                drawInfo.leftContext.textAlign = 'right';

                drawInfo.leftContext.strokeStyle = "black";
                drawInfo.centerContext.strokeStyle = "black";
                drawInfo.leftContext.globalAlpha = 0.6;
                drawInfo.centerContext.globalAlpha = 0.15;
                for (j = Math.ceil(minvl / jumps.Jump1); j <= Math.floor(maxvl / jumps.Jump1); j++) {
                    vl = j * jumps.Jump1;
                    yp = Math.round(drawInfo.sizeY - drawInfo.sizeY * 0.1 - (vl - minvl) / (maxvl - minvl) * drawInfo.sizeY * 0.8) - 0.5;
                    if (j % jumps.JumpReduc == 0) {
                        drawInfo.leftContext.beginPath();
                        drawInfo.leftContext.moveTo(drawInfo.sizeLeftX - 8, yp);
                        drawInfo.leftContext.lineTo(drawInfo.sizeLeftX, yp);
                        drawInfo.leftContext.stroke();
                        drawInfo.leftContext.fillText(vl.toFixed(jumps.textDecimalCount), drawInfo.sizeLeftX - 12, yp + 5);
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(0, yp);
                        drawInfo.centerContext.lineTo(drawInfo.sizeCenterX, yp);
                        drawInfo.centerContext.stroke();
                    }
                    else {
                        drawInfo.leftContext.beginPath();
                        drawInfo.leftContext.moveTo(drawInfo.sizeLeftX - 4, yp);
                        drawInfo.leftContext.lineTo(drawInfo.sizeLeftX, yp);
                        drawInfo.leftContext.stroke();
                    }
                }
                drawInfo.leftContext.globalAlpha = 1;
                drawInfo.centerContext.globalAlpha = 1;

            }

            that.drawTitle = function (drawInfo) {
                drawInfo.leftContext.save();
                drawInfo.leftContext.translate(0, drawInfo.sizeY / 2);
                drawInfo.leftContext.rotate(-Math.PI / 2);
                drawInfo.leftContext.textBaseline = 'top';
                drawInfo.leftContext.textAlign = "center";
                drawInfo.leftContext.font = '11px sans-serif';
                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.fillText(this._title, 0, 5);
                drawInfo.leftContext.font = '10px sans-serif';
                drawInfo.leftContext.fillStyle = "rgb(100,100,100)";
                drawInfo.leftContext.fillText(this._subTitle, 0, 25);
                drawInfo.leftContext.restore();
            }

            that.drawMark = function (drawInfo) {
                if (drawInfo.mark.present) {
                    var psx1 = Math.round((drawInfo.mark.pos1) * drawInfo.zoomFactX - drawInfo.offsetX) - 1;
                    var psx2 = Math.round((drawInfo.mark.pos2) * drawInfo.zoomFactX - drawInfo.offsetX) + 1;
                    drawInfo.centerContext.globalAlpha = 0.15;
                    drawInfo.centerContext.fillStyle = "rgb(255,0,0)";
                    drawInfo.centerContext.fillRect(psx1, 0, psx2 - psx1, drawInfo.sizeY);
                    drawInfo.centerContext.globalAlpha = 1;
                    /*
                    centercontext.fillStyle = "rgb(192,0,0)";
                    centercontext.font = '11px sans-serif';
                    centercontext.textBaseline = 'top';
                    centercontext.textAlign = 'right';
                    centercontext.fillText(this._markPos1.toFixed(0), psx1, 7);
                    centercontext.textAlign = 'left';
                    var size = this._markPos2 - this._markPos1;
                    centercontext.fillText(size.toFixed(0) + 'bp', psx2, 7);*/
                }
            }

            that.drawXScale = function (drawInfo) {
                drawInfo.centerContext.strokeStyle = "black";
                var i1 = Math.round(((-50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                if (i1 < 0) i1 = 0;
                var i2 = Math.round(((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                for (i = i1; i <= i2; i++) {
                    var value = i * drawInfo.HorAxisScaleJumps.Jump1;
                    var psx = Math.round((value) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if ((psx >= -50) && (psx <= drawInfo.sizeCenterX + 50)) {
                        drawInfo.centerContext.globalAlpha = 0.075;
                        if (i % drawInfo.HorAxisScaleJumps.JumpReduc == 0)
                            drawInfo.centerContext.globalAlpha = 0.15;
                        drawInfo.centerContext.beginPath();
                        drawInfo.centerContext.moveTo(psx, 0);
                        drawInfo.centerContext.lineTo(psx, drawInfo.sizeY);
                        drawInfo.centerContext.stroke();
                    }
                }
                drawInfo.centerContext.globalAlpha = 1;
            }



            that.render = function (drawInfo) {
                if (!this._isVisible)
                    return;
                // X position conversion: X_screen = X_logical * drawInfo._zoomFactX - drawInfo._offsetX
                var locDrawInfo = {
                    offsetX: drawInfo.offsetX,
                    zoomFactX: drawInfo.zoomFactX,
                    HorAxisScaleJumps: drawInfo.HorAxisScaleJumps,
                    leftContext: this.getCanvasElement('left').getContext("2d"),
                    centerContext: this.getCanvasElement('center').getContext("2d"),
                    rightContext: this.getCanvasElement('right').getContext("2d"),
                    sizeLeftX: drawInfo.sizeLeftX,
                    sizeCenterX: drawInfo.sizeCenterX,
                    sizeRightX: drawInfo.sizeRightX,
                    mark: drawInfo.mark,
                    sizeY: this._height
                };
                this.draw(locDrawInfo);
            }


            return that;
        }





        ChannelCanvas.XScale = function (id) {
            var that = ChannelCanvas.Base(id);
            that._height = 23;

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 0.4);
                this.drawStandardGradientLeft(drawInfo, 0.4);
                this.drawStandardGradientRight(drawInfo, 0.4);

                drawInfo.centerContext.fillStyle = DQX.Color(0.85, 0.85, 0.85).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';

                var i1 = Math.round(((-50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                if (i1 < 0) i1 = 0;
                var i2 = Math.round(((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);

                for (i = i1; i <= i2; i++) {
                    drawInfo.centerContext.beginPath();
                    var value = i * drawInfo.HorAxisScaleJumps.Jump1;
                    var psx = Math.round((value) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if ((psx >= -50) && (psx <= drawInfo.sizeCenterX + 50)) {
                        if (i % drawInfo.HorAxisScaleJumps.JumpReduc == 0) {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.6, 0.6, 0.6).toString();
                            drawInfo.centerContext.moveTo(psx, 15);
                            drawInfo.centerContext.lineTo(psx, 30);
                            drawInfo.centerContext.stroke();
                            drawInfo.centerContext.fillText((value / 1.0e6), psx, 2);
                        }
                        else {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.5, 0.5, 0.5).toString();
                            drawInfo.centerContext.moveTo(psx, 18);
                            drawInfo.centerContext.lineTo(psx, 23);
                            drawInfo.centerContext.stroke();
                        }
                    }
                }
                this.drawMark(drawInfo);
            }

            return that;
        }



        return ChannelCanvas;
    });