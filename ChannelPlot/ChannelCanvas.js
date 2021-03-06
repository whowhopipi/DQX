﻿// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/


define(["_", "jquery", "DQX/DocEl", "DQX/Msg", "DQX/Scroller"],
    function (_, $, DocEl, Msg, Scroller) {
        var ChannelCanvas = {};


        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelCanvas.Base: a base class that implements a single channel in a ChannelPlotter
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////

        ChannelCanvas.Base = function (id) {
            if (!id) id='Channel_'+DQX.getNextUniqueID();
            var that = {};
            that._myID = id;
            that._height = 120;
            that._variableHeight = false;
            that._title = '';
            that._subTitle = '';
            that._toolTipInfo = { ID: null };
            that._onClickHandler = null;

            that._isVisible = true;
            that.canHide = true;
            that._maxViewportSizeX=1.0e9;//info will be hidden if the viewport gets larger than this

            that._isMarkVisible = true;

            that.getID = function () { return that._myID; }

            that.getRequiredRightWidth = function () {//can be overwritten
                return 0;
            }

            that.needVScrollbar = function () {//can be overwritten
                return false;
            }

            that.getVisible = function () { return this._isVisible; }

            that._setVisible = function (newStatus) {
                if (!newStatus) {
                    if (this._isOnTopPart) DQX.reportError("Invalid action");
                    if (!this.canHide) DQX.reportError("Channel cannot be hidden");
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

            that.scrollInView = function() {
                that._myPlotter.channelScrollInView(that.getID());
            }


            that.getMyPlotter = function () {
                if (!this._myPlotter) DQX.reportError("Channel is not yet associated to a plotter");
                return this._myPlotter;
            }

            that.getHeight = function () { return this._height; }
            that.setHeight = function (vl, isVariable) { this._height = vl; this._variableHeight = (isVariable == true); return this; }
            that.setAutoFillHeight = function () { this._autoFillHeight = true; }
            that.getAutoFillHeight = function () { return this._autoFillHeight; }

            that.setMaxViewportSizeX = function(maxval) {//defines the maximum viewport X size that can be shown. If the viewport gets larger, the content is replaced by a message
                this._maxViewportSizeX= maxval;
                return this;
            }

            that.setTitle = function (ititle) {
                this._title = DQX.interpolate(ititle);
                return this;
            }
            that.setSubTitle = function (isubtitle) {
                this._subTitle = DQX.interpolate(isubtitle);
                return this;
            }

            that.setHeaderTooltip = function(str) {
                that._headerTooltip = str;
            }

            that.getTitle = function () {
                return this._title;
            }

            that.getSubTitle = function () {
                return this._subTitle;
            }

            that.getVScroller = function () {
                if (!this.vScroller)
                    DQX.reportError("No VScroller present");
                return this.vScroller;
            }

            that.setPlotter = function (thePlotter) { } //can override

            that.setOnClickHandler = function(handler) {
                that._onClickHandler = handler;
            }

            that.setMarkVisible = function(status) {
                that._isMarkVisible = status;
            }

            that.hideToolTip = function () { } //can override en remove any tooltip if this function was called

            that.onHoverOverChannel = function (xp, yp) { return false; } //can override

            that.onStopHoverOverChannel = function () { return false; } //can override


            that.getCanvasID = function (ext) {
                return this.getMyPlotter().getSubID('') + '_channel_' + this._myID.replace('.', '_period_').replace(':', '_colon_') + '_' + ext;
            }

            that.getCenterElementID = function (ext) {
                return this.getCanvasID('center');
            }

            that.getCanvasElement = function (ext) {
                return $("#" + this.getCanvasID(ext))[0];
            }

            that.getCanvasElementJQ = function (ext) {
                return $("#" + this.getCanvasID(ext));
            }

            that.posXCenterCanvas2Screen = function (px) {
                return px + $(this.getCanvasElement('center')).offset().left;
            }

            that.posYCenterCanvas2Screen = function (py) {
                return py + $(this.getCanvasElement('center')).offset().top;
            }

            that.posXLeftCanvas2Screen = function (px) {
                return px + $(this.getCanvasElement('left')).offset().left;
            }

            that.posYLeftCanvas2Screen = function (py) {
                return py + $(this.getCanvasElement('left')).offset().top;
            }

            that.renderHtml = function () {
                var wrapper = DocEl.Div({ id: this.getCanvasID('wrapper') });
                wrapper.addStyle("white-space", "nowrap").addStyle("overflow", "hidden").addStyle("position", "relative");
                var elemLeft = DocEl.Create('canvas', { id: this.getCanvasID('left'), parent: wrapper });
                elemLeft.addAttribute("width", this.getMyPlotter().getLeftWidth());
                elemLeft.addAttribute("height", this._height);
                elemLeft.addStyle('display', 'inline-block');
                elemLeft.setWidthPx(this.getMyPlotter().getLeftWidth()).setHeightPx(that._height);
                var elemCenter = DocEl.Create('canvas', { id: this.getCanvasID('center'), parent: wrapper });
                elemCenter.setCssClass('DQXChannelPlotChannelCenter');
                elemCenter.addAttribute("height", that._height);
                elemCenter.addStyle('display', 'inline-block');
                //elemCenter.addStyle('image-rendering', '-webkit-optimize-contrast');<--gives poor results on iPad
                elemCenter.setWidthPx(10).setHeightPx(that._height);
                var elemRight = DocEl.Create('canvas', { id: this.getCanvasID('right'), parent: wrapper });
                elemRight.addAttribute("width", this.getMyPlotter().getRightWidth());
                elemRight.addAttribute("height", this._height);
                elemRight.addStyle('display', 'inline-block');
                elemRight.setWidthPx(this.getMyPlotter().getRightWidth()).setHeightPx(that._height);

                if (this.needVScrollbar()) {
                    var scrollerid = this.getCanvasID("VSC");
                    var cnvscroller = DocEl.Create('canvas', { id: scrollerid, parent: wrapper });
                    cnvscroller.addAttribute("width", Scroller.vScrollWidth).addAttribute("height", this.getHeight());
                    cnvscroller.addStyle('display', 'inline-block');
                    //cnvscroller.addStyle('position', 'relative');
                }

                return wrapper.toString();
            }

            //Modifies the height of the channel after is was created
            that.modifyHeight = function (newHeight) {
                this._height = newHeight;
                $('#' + this.getCanvasID('left')).height(newHeight);
                $('#' + this.getCanvasID('left')).attr('height', newHeight);
                $('#' + this.getCanvasID('center')).height(newHeight);
                $('#' + this.getCanvasID('center')).attr('height', newHeight);
                $('#' + this.getCanvasID('right')).height(newHeight);
                $('#' + this.getCanvasID('right')).attr('height', newHeight);
            }

            that.postCreateHtml = function () {
                $('#' + this.getCanvasID('center')).click($.proxy(_.partialRight(that._onMouseClick, 'center'), that));
                $('#' + this.getCanvasID('left')).click($.proxy(_.partialRight(that._onMouseClick, 'left'), that));
                $('#' + this.getCanvasID('center')).mousedown($.proxy(that._onMouseDown, that));
                $('#' + this.getCanvasID('center')).mousemove($.proxy(that._onMouseMove, that));
                $('#' + this.getCanvasID('center')).mouseenter($.proxy(that._onMouseEnter, that));
                $('#' + this.getCanvasID('center')).mouseleave($.proxy(that._onMouseLeave, that));
                $('#' + this.getCanvasID('left')).mouseenter($.proxy(that._onLeftMouseEnter, that));
                $('#' + this.getCanvasID('left')).mouseleave($.proxy(that._onLeftMouseLeave, that));
                $('#' + this.getCanvasID('left')).mousemove($.proxy(that._onLeftMouseMove, that));



                DQX.augmentTouchEvents(this, this.getCanvasID('center'), true, true);

                if (this.needVScrollbar()) {
                    this.vScroller = Scroller.VScrollBar(this.getCanvasID("VSC"));
                    this.vScroller.myConsumer = this;
                    this.vScroller.draw();
                }

                this._updateVisibility();
            }

            that.resizeY = function (newH) {
                this._height = newH;
                $('#' + this.getCanvasID('left')).height(newH);
                this.getCanvasElement('left').height = newH;
                $('#' + this.getCanvasID('center')).height(newH);
                this.getCanvasElement('center').height = newH;
                $('#' + this.getCanvasID('right')).height(newH);
                this.getCanvasElement('right').height = newH;
                if (this.vScroller)
                    this.vScroller.resize(newH);
            }

            that.handleResizeX = function (width) {
                var w2 = width - this.getMyPlotter().getLeftWidth() - this.getMyPlotter().getRightWidth() - this.getMyPlotter().getRightOffset();
                $('#' + this.getCanvasID('center')).width(w2);
                this.getCanvasElement('center').width = w2;
                $('#' + this.getCanvasID('right')).width(this.getMyPlotter().getRightWidth());
                this.getCanvasElement('right').width = this.getMyPlotter().getRightWidth();
            }


            that._onMouseClick = function (ev, area) {
                if (that._wasDragged) {
                    that._wasDragged = false;
                    return;
                }
              var area = area || 'center';
//                if (!this.getMyPlotter()._hasMouseMoved) {
                    var px = this.getEventPosX(ev);
                    var py = this.getEventPosY(ev);
                    if (area=='left')
                        px = this.getEventLeftPosX(ev);
                    var params = {
                        shiftPressed:ev.shiftKey,
                        controlPressed:ev.ctrlKey,
                        altPressed:ev.altKey
                    };
                    this.handleMouseClicked(px, py, area, params);
  //              }

            }

            that.handleTouchStart = function (info, ev) {
                this.touchMoved = false;
                this.touchStartElemX = info.elemX;
                this.touchStartElemY = info.elemY;
                this.getMyPlotter().handleMouseDown(that, ev, { x: info.elemX, channelY: info.elemY, pageY: info.pageY });
            }

            that.handleTouchMove = function (info, ev) {
                if (Math.abs(info.elemX - this.touchStartElemX) + Math.abs(info.elemY - this.touchStartElemY) > 20)
                    this.touchMoved = true;
                this.getMyPlotter().handleMouseMove(that, ev, { x: info.elemX, channelY: info.elemY, pageY: info.pageY });
            }

            that.handleTouchEnd = function (ev) {
                this.getMyPlotter().handleMouseUp(that, ev, null);
                if (!this.touchMoved)
                    this.handleMouseClicked(this.touchStartElemX, this.touchStartElemY, 'center', {});
            }

            that.handleTouchCancel = function (ev) {
                this.getMyPlotter().handleMouseUp(that, ev, null);
            }

            that.handleGestureStart = function (ev) {
                this.previousScale = 1.0;
                this.scaleCenterPosxX = 200;
                if (ev.pageX)
                    this.scaleCenterPosxX = ev.pageX - $(this.getCanvasElement('center')).offset().left;
            }

            that.handleGestureChange = function (ev) {
                if (ev.scale) {
                    this.getMyPlotter().reScale(ev.scale / this.previousScale, this.scaleCenterPosxX);
                    this.previousScale = ev.scale;
                }
            }

            that.handleGestureEnd = function (ev) {
            }

            that._onMouseDown = function (ev) {
                that._wasDragged = false;
                that._mouseDownStartPos = {x: this.getEventPosX(ev), y: this.getEventPosY(ev)};
                $(document).bind("mouseup.ChannelCanvas", $.proxy(that._onMouseDragUp, that));
                $(document).bind("mousemove.ChannelCanvas", $.proxy(that._onMouseDragMove, that));
                this.getMyPlotter().handleMouseDown(that, ev, { x: that._mouseDownStartPos.x, channelY: that._mouseDownStartPos.y, pageY: ev.pageY });
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragUp = function (ev) {
                $(document).unbind("mouseup.ChannelCanvas");
                $(document).unbind("mousemove.ChannelCanvas");
                this.getMyPlotter().handleMouseUp(that, ev, { x: this.getEventPosX(ev), channelY: this.getEventPosY(ev), pageY: ev.pageY });
                ev.returnValue = false;
                return false;
            }

            that._onMouseDragMove = function (ev) {
                var pos = {x: this.getEventPosX(ev), y: this.getEventPosY(ev)};
                if ( (Math.abs(pos.x-that._mouseDownStartPos.x)>4) || (Math.abs(pos.y-that._mouseDownStartPos.y)>4) )
                    that._wasDragged = true;
                this.getMyPlotter().handleMouseMove(that, ev, { x: pos.x, channelY: pos.y, pageY: ev.pageY });
                ev.returnValue = false;
                return false;
            }




            //Returns the position X coordinate of an event, relative to the center canvas element
            that.getEventPosX = function (ev) {
                var ev1 = ev;
                if (ev.originalEvent)
                    ev1 = ev.originalEvent;
                return ev1.pageX - $(this.getCanvasElement('center')).offset().left;
            }

            //Returns the position Y coordinate of an event, relative to the center canvas element
            that.getEventPosY = function (ev) {
                var ev1 = ev;
                if (ev.originalEvent)
                    ev1 = ev.originalEvent;
                return ev1.pageY - $(this.getCanvasElement('center')).offset().top;
            }

            //Returns the position X coordinate of an event, relative to the left canvas element
            that.getEventLeftPosX = function (ev) {
                var ev1 = ev;
                if (ev.originalEvent)
                    ev1 = ev.originalEvent;
                return ev1.pageX - $(this.getCanvasElement('left')).offset().left;
            }


            that._onMouseEnter = function (ev) {
            }

            that._onMouseLeave = function (ev) {
                this.onStopHoverOverChannel();
                this.hideToolTip();
            }

            that.handleMouseClicked = function (px, py, area, params) {
            }

            // Override this function to implement a tooltip
            // Note: getLeftToolTipInfo can also be defined for the left panel
            that.getToolTipInfo = function (px, py) {
                return null;
            }

            that._onMouseMove = function (ev) {
                var px = this.getEventPosX(ev);
                var py = this.getEventPosY(ev);
                this.onHoverOverChannel(px, py);
                var newToolTipInfo = this.getToolTipInfo(px, py);
                var showPointer = false;
                if (newToolTipInfo) {
                    if (newToolTipInfo.showPointer)
                        showPointer = true;
                    if (this._toolTipInfo.ID != newToolTipInfo.ID) {
                        this.hideToolTip();
                        this._toolTipInfo = newToolTipInfo;
                        var tooltip = DocEl.Div();
                        tooltip.setCssClass("DQXChannelToolTip");
                        tooltip.addStyle("position", "absolute");
                        tooltip.addStyle("left", (this.posXCenterCanvas2Screen(this._toolTipInfo.px) + 10) + 'px');
                        tooltip.addStyle("top", (this.posYCenterCanvas2Screen(this._toolTipInfo.py) + 10) + 'px');
                        tooltip.addElem(this._toolTipInfo.content||'');
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
                var cursorName = 'auto';
                if (this._myPlotter && this._myPlotter.isSelecting)
                    cursorName = 'ew-resize';
                if (showPointer)
                    cursorName = 'pointer';
                $('#' + this.getCanvasID('center')).css('cursor', cursorName);
            }

            that.hideToolTip = function () {
                this._toolTipInfo.ID = null;
                $('#DQXUtilContainer').find('.DQXChannelToolTip').remove();
                $('#DQXUtilContainer').find('.DQXChannelToolTipHighlightPoint').remove();
            }



            that._onLeftMouseLeave = function (ev) {
                this.onStopHoverOverChannel();
                this.hideHeaderToolTip();
                this.hideToolTip();
            }

            that._onLeftMouseEnter = function (ev) {
                if ((!that._currentHeaderTooltipID)&&(that._headerTooltip)) {
                    that._currentHeaderTooltipID = 'ChannelHeaderTooltip_'+DQX.getNextUniqueID();
                    var px = this.getEventPosX(ev);
                    var py = this.getEventPosY(ev);
                    var tooltip = DocEl.Div({ id:that._currentHeaderTooltipID });
                    tooltip.setCssClass("DQXChannelToolTip");
                    tooltip.addStyle("position", "absolute");
                    var screenWidth = $('#Div1').width();
                    //var screenBottom = $('#Div1').height();
                    tooltip.addStyle("right", (screenWidth - this.posXLeftCanvas2Screen(0)-0) + 'px');
                    tooltip.addStyle("top", (this.posYLeftCanvas2Screen(0)) + 'px');
                    tooltip.addElem(that._headerTooltip);
                    $('#DQXUtilContainer').append(tooltip.toString());
                }
            }

            that.hideHeaderToolTip = function () {
                $('#'+that._currentHeaderTooltipID).remove();
                that._currentHeaderTooltipID = null;
            }


            that._onLeftMouseMove = function (ev) {
                var px = this.getEventLeftPosX(ev);
                var py = this.getEventPosY(ev);
                if (that.getLeftToolTipInfo) {
                    var newToolTipInfo = that.getLeftToolTipInfo(px, py);
                    var showPointer = false;
                    if (newToolTipInfo) {
                        if (newToolTipInfo.showPointer)
                            showPointer = true;
                        if (this._toolTipInfo.ID != newToolTipInfo.ID) {
                            this.hideToolTip();
                            this._toolTipInfo = newToolTipInfo;
                            var tooltip = DocEl.Div();
                            tooltip.setCssClass("DQXChannelToolTip");
                            tooltip.addStyle("position", "absolute");
                            tooltip.addStyle("left", (this.posXLeftCanvas2Screen(this._toolTipInfo.px) + 10) + 'px');
                            tooltip.addStyle("top", (this.posYLeftCanvas2Screen(this._toolTipInfo.py) + 10) + 'px');
                            tooltip.addElem(this._toolTipInfo.content||'');
                            $('#DQXUtilContainer').append(tooltip.toString());
                        }
                    }
                    else
                        this.hideToolTip();
                    if (showPointer)
                        $('#' + this.getCanvasID('left')).css('cursor', 'pointer');
                    else
                        $('#' + this.getCanvasID('left')).css('cursor', 'auto');
                }
            }


            that.drawStandardGradientCenter = function (drawInfo, fc) {
                var backgrad = drawInfo.centerContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, DQX.Color(fc, fc, fc));
                backgrad.addColorStop(1, DQX.Color(0.95 * fc, 0.95 * fc, 0.95 * fc));
                drawInfo.centerContext.fillStyle = backgrad;
                drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, drawInfo.sizeY);
                drawInfo.centerContext.fillStyle = DQX.Color(0.7 * fc, 0.7 * fc, 0.7 * fc).toString();
                drawInfo.centerContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeCenterX, 1);
                drawInfo.centerContext.fillStyle = DQX.Color(0.8 * fc, 0.8 * fc, 0.8 * fc).toString();
                drawInfo.centerContext.fillRect(0, drawInfo.sizeY - 2, drawInfo.sizeCenterX, 1);
            }

            that.drawStandardGradientLeft = function (drawInfo, fc) {
                var backgrad = drawInfo.leftContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                backgrad.addColorStop(0, DQX.Color(0.95 * fc, 0.95 * fc, 0.95 * fc));
                backgrad.addColorStop(1, DQX.Color(0.9 * fc, 0.9 * fc, 0.9 * fc));
                drawInfo.leftContext.fillStyle = backgrad;
                drawInfo.leftContext.fillRect(0, 0, drawInfo.sizeLeftX, drawInfo.sizeY);
                drawInfo.leftContext.fillStyle = DQX.Color(0.6 * fc, 0.6 * fc, 0.6 * fc).toString();
                drawInfo.leftContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeLeftX, 1);
                drawInfo.leftContext.fillStyle = DQX.Color(0.7 * fc, 0.7 * fc, 0.7 * fc).toString();
                drawInfo.leftContext.fillRect(0, drawInfo.sizeY - 2, drawInfo.sizeLeftX, 1);
            }

            that.drawStandardGradientRight = function (drawInfo, fc) {
                if (drawInfo.sizeRightX > 2) {
                    var backgrad = drawInfo.rightContext.createLinearGradient(0, 0, 0, drawInfo.sizeY);
                    backgrad.addColorStop(0, DQX.Color(0.9 * fc, 0.9 * fc, 0.9 * fc));
                    backgrad.addColorStop(1, DQX.Color(0.8 * fc, 0.8 * fc, 0.8 * fc));
                    drawInfo.rightContext.fillStyle = backgrad;
                    drawInfo.rightContext.fillRect(0, 0, drawInfo.sizeRightX, drawInfo.sizeY);
                    drawInfo.rightContext.fillStyle = DQX.Color(0.6 * fc, 0.6 * fc, 0.6 * fc).toString();
                    drawInfo.rightContext.fillRect(0, drawInfo.sizeY - 1, drawInfo.sizeRightX, 1);
                }
            }

            //Draws a message in the center panel of the channel
            that.drawMessage = function (drawInfo, txt1, txt2) {
                drawInfo.centerContext.fillStyle = "rgb(210,210,210)";
                drawInfo.centerContext.globalAlpha = 0.2;
                drawInfo.centerContext.fillRect(0, 0, drawInfo.sizeCenterX, drawInfo.sizeY);
                drawInfo.centerContext.globalAlpha = 1.0;
                drawInfo.leftContext.fillStyle = "rgb(210,210,210)";
                drawInfo.leftContext.globalAlpha = 0.2;
                drawInfo.leftContext.fillRect(0, 0, drawInfo.sizeLeftX, drawInfo.sizeY);
                drawInfo.leftContext.globalAlpha = 1.0;
                drawInfo.centerContext.fillStyle = "black";
                drawInfo.centerContext.font = 'bold 15px sans-serif';
                drawInfo.centerContext.textBaseline = 'bottom';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.globalAlpha = 0.6;
                drawInfo.centerContext.fillText(txt1, drawInfo.sizeCenterX / 2, Math.min(50, drawInfo.sizeY / 2 + 7));
                if (txt2) {
                    drawInfo.centerContext.fillText(txt2, drawInfo.sizeCenterX / 2, Math.min(77, drawInfo.sizeY / 2 + 7 + 27));
                }
                drawInfo.centerContext.globalAlpha = 1.0;
            }


            that.drawFetchBusyMessage = function (drawInfo) {
                drawInfo.centerContext.fillStyle = "rgb(0,192,0)";
                drawInfo.centerContext.font = '13px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.fillText("Fetching data...", drawInfo.sizeCenterX / 2, 0);
            }

            that.drawFetchFailedMessage = function (drawInfo) {
                drawInfo.centerContext.fillStyle = "rgb(255,0,0)";
                drawInfo.centerContext.font = '13px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';
                drawInfo.centerContext.fillText("Fetch failed !", drawInfo.sizeCenterX / 2, 0);
            }

            //Draws a vertical scale in the left panel of the channel
            that.drawVertScale = function (drawInfo, minvl, maxvl, iSettings) {
                var offsetFrac = 0.1;
                var rangeFrac = 0.8;
                if (iSettings && (typeof(iSettings.offsetFrac) != 'undefined') )
                    offsetFrac = iSettings.offsetFrac;
                if (iSettings && (typeof(iSettings.rangeFrac) != 'undefined'))
                    rangeFrac = iSettings.rangeFrac;
                var cnt = drawInfo.sizeY*(15.0/120.0);
                var jumps = DQX.DrawUtil.getScaleJump((maxvl - minvl) / cnt);

                drawInfo.leftContext.fillStyle = "black";
                drawInfo.leftContext.font = '10px sans-serif';
                drawInfo.leftContext.textBaseline = 'bottom';
                drawInfo.leftContext.textAlign = 'right';

                drawInfo.leftContext.strokeStyle = "black";
                drawInfo.centerContext.strokeStyle = "black";
                drawInfo.leftContext.globalAlpha = 0.6;
                drawInfo.centerContext.globalAlpha = 0.05;
                drawInfo.centerContext.lineWidth = 1;
                var maxLabelSizeX = 0;
                for (j = Math.ceil(minvl / jumps.Jump1); j <= Math.floor(maxvl / jumps.Jump1); j++) {
                    vl = j * jumps.Jump1;
                    yp = Math.round(drawInfo.sizeY - drawInfo.sizeY * offsetFrac - (vl - minvl) / (maxvl - minvl) * drawInfo.sizeY * rangeFrac) - 0.5;
                    if (j % jumps.JumpReduc == 0) {
                        drawInfo.leftContext.beginPath();
                        drawInfo.leftContext.moveTo(drawInfo.sizeLeftX - 8, yp);
                        drawInfo.leftContext.lineTo(drawInfo.sizeLeftX, yp);
                        drawInfo.leftContext.stroke();
                        if (yp<drawInfo.sizeY-2) {
                            var labelStr = vl.toFixed(jumps.textDecimalCount);
                            drawInfo.leftContext.fillText(labelStr, drawInfo.sizeLeftX - 12, yp + 5);
                            maxLabelSizeX = Math.max(maxLabelSizeX, drawInfo.leftContext.measureText(labelStr).width);
                        }
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
                drawInfo.leftPanelRightOffset = maxLabelSizeX + 15;
                drawInfo.leftContext.globalAlpha = 1;
                drawInfo.centerContext.globalAlpha = 1;

            }

            that.drawTitle = function (drawInfo) {

                function wrapTextGetLines(text, maxWidth) {
                    var words = text.split(' ');
                    var lines = [];
                    var line = '';
                    for(var n = 0; n < words.length; n++) {
                        var testLine = line + words[n] + ' ';
                        var metrics = ctx.measureText(testLine);
                        var testWidth = metrics.width;
                        if (testWidth > maxWidth && n > 0) {
                            lines.push(line);
                            line = words[n] + ' ';
                        }
                        else {
                            line = testLine;
                        }
                    }
                    lines.push(line);
                    return lines;
                }

                var ctx = drawInfo.leftContext;

                ctx.font = '11px sans-serif';
                ctx.fillStyle = "black";
                var lineHeight = 12;

                var xSpace = drawInfo.sizeLeftX;
                if (drawInfo.leftPanelRightOffset)
                    xSpace -= drawInfo.leftPanelRightOffset;
                var ySpace = drawInfo.sizeY-15;

                var drawVert = ( ySpace >= xSpace *1.5);//Switch to vertical orientation if panel has a vertical aspect ratio
                ctx.save();
                if (drawVert) {
                    ctx.translate(0, drawInfo.sizeY / 2);
                    ctx.rotate(-Math.PI / 2);
                    ctx.textAlign = "center";
                    ctx.textBaseline = 'top';
                    var dw = ySpace;
                    var dh = xSpace;
                    var centerH = false;
                }
                else {
                    ctx.translate(2, drawInfo.sizeY / 2);
                    ctx.textAlign = "left";
                    ctx.textBaseline = 'top';
                    var dw = xSpace;
                    var dh = ySpace;
                    var centerH = true;
                }

                var linesTitle1 = [];
                var linesTitle2 = [];
                if (dh>20) {// Spread over several lines if necessary
                    if (that._title)
                        linesTitle1 = wrapTextGetLines(that._title, dw);
                    if (that._subTitle)
                        linesTitle2 = wrapTextGetLines(that._subTitle, dw);
                }
                else {//Too narrow - use single line only
                    if (that._title)
                        linesTitle1 =[that._title];
                    if (that._subTitle)
                        linesTitle2 = [that._subTitle];
                }


                var lineCount = linesTitle1.length + linesTitle2.length;
                var yoffset = 5;
                if (centerH)
                    yoffset = -lineCount*lineHeight/2;
                $.each(linesTitle1, function(idx, line) {
                    ctx.fillText(line, 0, yoffset);
                    yoffset += lineHeight;
                });
                ctx.font = '10px sans-serif';
                ctx.fillStyle = "rgb(100,100,100)";
                $.each(linesTitle2, function(idx, line) {
                    ctx.fillText(line, 0, yoffset);
                    yoffset += lineHeight;
                });


                ctx.restore();
            }

            that.drawMark = function (drawInfo, showText) {
                if (!that._isMarkVisible)
                    return;
                if (drawInfo.mark.present) {
                    var psx1 = Math.round((drawInfo.mark.pos1) * drawInfo.zoomFactX - drawInfo.offsetX) - 0.5;
                    var psx2 = Math.round((drawInfo.mark.pos2) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if (psx2 < psx1) { var psxtmp = psx1; psx1 = psx2; psx2 = psxtmp; }
                    if (psx2 - psx1 < 5) {
                        psx1--;
                        psx2++;
                    }
                    //                    drawInfo.centerContext.globalAlpha = 0.1;
                    //                    drawInfo.centerContext.fillStyle = "rgb(255,0,0)";

                    var markgrad = drawInfo.centerContext.createLinearGradient(psx1, 0, psx2, 0);
                    var markWidth = Math.max(1, psx2 - psx1);
                    markgrad.addColorStop(0, "rgba(255,50,0,0.2)");
                    markgrad.addColorStop(Math.min(0.45, 30 / markWidth), "rgba(255,50,0,0.05)");
                    markgrad.addColorStop(Math.max(0.55, 1 - 30 / markWidth), "rgba(255,50,0,0.05)");
                    markgrad.addColorStop(1, "rgba(255,50,0,0.2)");
                    drawInfo.centerContext.fillStyle = markgrad;
                    drawInfo.centerContext.fillRect(psx1, 0, psx2 - psx1, drawInfo.sizeY);

                    drawInfo.centerContext.globalAlpha = 0.5;
                    drawInfo.centerContext.strokeStyle = "rgb(255,50,0)";
                    drawInfo.centerContext.beginPath();
                    drawInfo.centerContext.moveTo(psx1, 0); drawInfo.centerContext.lineTo(psx1, drawInfo.sizeY);
                    drawInfo.centerContext.moveTo(psx2, 0); drawInfo.centerContext.lineTo(psx2, drawInfo.sizeY);
                    drawInfo.centerContext.stroke();
                    drawInfo.centerContext.globalAlpha = 1;

                    if (showText) {
                        drawInfo.centerContext.shadowColor = "rgb(255,255,255)";
                        drawInfo.centerContext.shadowBlur = 6;
                        drawInfo.centerContext.shadowOffsetX = 0;
                        drawInfo.centerContext.shadowOffsetY = 0;
                        drawInfo.centerContext.fillStyle = "rgb(255,50,0)";
                        drawInfo.centerContext.font = 'bold 12px sans-serif';
                        drawInfo.centerContext.textBaseline = 'top';
                        drawInfo.centerContext.textAlign = 'right';
                        //drawInfo.centerContext.lineWidth = 3;
                        drawInfo.centerContext.strokeStyle = 'rgb(192,192,192)';
                        var txt = Math.min(drawInfo.mark.pos1, drawInfo.mark.pos2).toFixed(0);
                        drawInfo.centerContext.strokeText(txt, psx1 - 1, 10);
                        drawInfo.centerContext.fillText(txt, psx1 - 1, 10);
                        drawInfo.centerContext.textAlign = 'left';
                        var size = Math.abs(drawInfo.mark.pos2 - drawInfo.mark.pos1);
                        txt = size.toFixed(0)/* + 'bp'*/;
                        drawInfo.centerContext.strokeText(txt, psx2, 10);
                        drawInfo.centerContext.fillText(txt, psx2, 10);
                        drawInfo.centerContext.shadowBlur = 0;
                        drawInfo.centerContext.shadowColor = "transparent";
                    }
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
                        drawInfo.centerContext.globalAlpha = 0.05;
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

            that.quick_top = function(ele) {
                if (!ele[0]) return;
                var d = ele.offsetParent().offset(),
                    c = ele.offset();
                return c.top - d.top;
            };



            that.render = function (drawInfo) {
                if (!this._isVisible)
                    return;
                var centerElement = this.getCanvasElementJQ('center');

                // X position conversion: X_screen = X_logical * drawInfo._zoomFactX - drawInfo._offsetX
                var parent = centerElement.parent();
                var parent_parent = parent.parent();
                var topVisible = this.quick_top(parent_parent) - this.quick_top(parent);
                var bottomVisible = topVisible + parent_parent.height();
                if ((bottomVisible < 0) || (topVisible>this._height))
                    return;
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
                    sizeY: this._height,
                    needZoomIn: false,
                    top_visible: topVisible,
                    bottom_visible: bottomVisible
                };

                if ( drawInfo.sizeCenterX/drawInfo.zoomFactX > that._maxViewportSizeX ) {
                    locDrawInfo.needZoomIn= true;
                }

                if (locDrawInfo.needZoomIn) {
                    var darkenFactor = 0.9;
                    this.drawStandardGradientCenter(locDrawInfo, darkenFactor);
                    this.drawStandardGradientLeft(locDrawInfo, darkenFactor);
                    this.drawStandardGradientRight(locDrawInfo, darkenFactor);
                    this.drawMessage(locDrawInfo, "Zoom in to see " + this._title);
                    if (this._always_call_draw)
                        this.draw(locDrawInfo);
                }
                else
                    this.draw(locDrawInfo);
                if ('postDraw' in this)
                    this.postDraw(locDrawInfo);

                //Fade-style visual feedback for scroll availability
                var scrollFadeSize = 18;
                if (drawInfo.offsetX > 0) {
                    var backgrad = locDrawInfo.centerContext.createLinearGradient(0, 0, scrollFadeSize, 0);
                    backgrad.addColorStop(0, "rgba(230,230,230,0.85)");
                    backgrad.addColorStop(1, "rgba(230,230,230,0.0)");
                    locDrawInfo.centerContext.fillStyle = backgrad;
                    locDrawInfo.centerContext.fillRect(0, 1, scrollFadeSize, locDrawInfo.sizeY - 2);
                }
                if (drawInfo.rightSideNotComplete) {
                    var backgrad = locDrawInfo.centerContext.createLinearGradient(locDrawInfo.sizeCenterX - scrollFadeSize, 0, locDrawInfo.sizeCenterX, 0);
                    backgrad.addColorStop(0, "rgba(230,230,230,0.0)");
                    backgrad.addColorStop(1, "rgba(230,230,230,0.85)");
                    locDrawInfo.centerContext.fillStyle = backgrad;
                    locDrawInfo.centerContext.fillRect(locDrawInfo.sizeCenterX - scrollFadeSize, 1, scrollFadeSize, locDrawInfo.sizeY - 2);
                }
            }


            return that;
        }



        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Class ChannelCanvas.XScale: implements a channel that shows a horizontal scale
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////////////////////


        ChannelCanvas.XScale = function (id) {
            var that = ChannelCanvas.Base(id);
            that._height = 22;

            that.draw = function (drawInfo) {
                this.drawStandardGradientCenter(drawInfo, 0.84);
                this.drawStandardGradientLeft(drawInfo, 0.84);
                this.drawStandardGradientRight(drawInfo, 0.84);

                drawInfo.centerContext.fillStyle = DQX.Color(0.0, 0.0, 0.0).toString();
                drawInfo.centerContext.font = '11px sans-serif';
                drawInfo.centerContext.textBaseline = 'top';
                drawInfo.centerContext.textAlign = 'center';

                var drawBP = (drawInfo.zoomFactX>0.5);
                var unit = 'Mb';
                if  (drawBP)
                    unit = 'bp';


                var i1 = Math.round(((-50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);
                if (i1 < 0) i1 = 0;
                var i2 = Math.round(((drawInfo.sizeCenterX + 50 + drawInfo.offsetX) / drawInfo.zoomFactX) / drawInfo.HorAxisScaleJumps.Jump1);

                for (i = i1; i <= i2; i++) {
                    drawInfo.centerContext.beginPath();
                    var value = i * drawInfo.HorAxisScaleJumps.Jump1;
                    var psx = Math.round((value) * drawInfo.zoomFactX - drawInfo.offsetX) + 0.5;
                    if ((psx >= -50) && (psx <= drawInfo.sizeCenterX + 50)) {
                        if (i % drawInfo.HorAxisScaleJumps.JumpReduc == 0) {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.0, 0.0, 0.0).toString();
                            drawInfo.centerContext.moveTo(psx, that._height-6);
                            drawInfo.centerContext.lineTo(psx, that._height);
                            drawInfo.centerContext.stroke();
                            if (drawBP) {
                                var valtxt = value.toFixed(0);
                                valtxt = valtxt.split("").reverse().join("");
                                var valtxt2 = [];
                                for (var sp = 0; sp<valtxt.length; sp++) {
                                    if ((sp>0) && (sp%3 == 0))
                                        valtxt2.push(",");
                                    valtxt2.push(valtxt[sp]);
                                }
                                valtxt = valtxt2.reverse().join("");
                                if (valtxt === '0')
                                  drawInfo.centerContext.fillText(valtxt, psx+2, 3);
                                else
                                  drawInfo.centerContext.fillText(valtxt, psx, 3);
                            }
                            else
                              if (value === 0)
                                drawInfo.centerContext.fillText((value / 1.0e6), psx+2, 3);
                              else
                                drawInfo.centerContext.fillText((value / 1.0e6), psx, 3);

                        }
                        else {
                            drawInfo.centerContext.strokeStyle = DQX.Color(0.3, 0.3, 0.3).toString();
                            drawInfo.centerContext.moveTo(psx, that._height-3);
                            drawInfo.centerContext.lineTo(psx, that._height);
                            drawInfo.centerContext.stroke();
                        }
                    }
                }
                this.drawMark(drawInfo, true);

                drawInfo.leftContext.fillStyle = DQX.Color(0, 0, 0).toString();
                drawInfo.leftContext.font = '11px sans-serif';
                drawInfo.leftContext.textBaseline = 'top';
                drawInfo.leftContext.textAlign = 'left';
                drawInfo.leftContext.fillText('Position ({unit})'.DQXformat({unit:unit}), 2, 3);

            }

            return that;
        }



        return ChannelCanvas;
    });
