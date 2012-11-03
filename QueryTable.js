﻿define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg"],
    function ($, DQX, DocEl, Msg) {

        //Namespace for query tables
        var QueryTable = {}

        //Defines a column in a query table
        //Name is the displayed title of the column
        //CompID is the identifier of the column in the data fetcher
        //Tablepart can be 0 or 1 to define the left or right part
        QueryTable.Column = function (iName, iCompID, iTablePart) {
            var that = {};
            that.myName = iName;
            that.myCompID = iCompID;
            that.myComment = '';
            that.TablePart = iTablePart;
            that.Collapsed = false;
            that._hyperlinkCellMessageScope = null;
            that._hyperlinkHeaderMessageScope = null;

            that.CellToText = function (content) { return content; }
            that.CellToColor = function (content) { return "white"; }

            //Use this function to convert a column cell into a hyperlink.
            //A message will be sent when the user clicks the link
            that.makeHyperlinkCell = function (messageScope) {
                this._hyperlinkCellMessageScope = messageScope;
            }

            //Use this function to convert a column header into a hyperlink.
            //A message will be sent when the user clicks the link
            that.makeHyperlinkHeader = function (messageScope) {
                this._hyperlinkHeaderMessageScope = messageScope;
            }

            return that;
        }

        QueryTable._reflectOwnMessage = function (ID, message1, message2, message3) {
            return QueryTable.FindTable(ID)._onOwnMessage(message1, message2, message3);
        }


        QueryTable._list = [];


        //Returns a channelplot by its center canvas id, or return null if not found
        QueryTable.FindTable = function (iID) {
            for (var i in QueryTable._list)
                if (QueryTable._list[i].myBaseID == iID)
                    return QueryTable._list[i];
            return null;
        }


        ///////////////////////////////////////////////////////////////////////////////
        // The Query table class
        ///////////////////////////////////////////////////////////////////////////////
        // iBaseID: the identifier of the div that contains the table elements
        // iDataFetcher: the DQX.DataFetcher.Curve class that provides the data for this table

        QueryTable.Table = function (iBaseID, iDataFetcher) {
            var that = {};
            QueryTable._list.push(that);
            that.myBaseID = iBaseID;
            that.myDataFetcher = iDataFetcher;
            that.myColumns = [];
            that.mySortOptions = [];
            that.myPageSize = 20;
            that.myDataFetcher.myDataConsumer = that;

            that._dataValid = false; //false= does not have valid data
            that.myTableOffset = 0;
            that.totalRecordCount = -1; //means not yet determined

            //Finds a html element in the cluster of elements that define this table
            that.getElement = function (extension) {
                var id = "#" + this.myBaseID + extension;
                var rs = $(id);
                if (rs.length == 0)
                    throw "Missing query table element " + id;
                return rs;
            }

            //Adds a new column to the table, providing a QueryTable.Column
            that.addTableColumn = function (iCol) {
                this.myDataFetcher.activateFetchColumn(iCol.myCompID);
                this.myColumns.push(iCol);
                return iCol;
            }

            //finds and returns a column definition, providing the column identifier
            that.findColumn = function (iColID) {
                for (var colnr in this.myColumns)
                    if (this.myColumns[colnr].myCompID == iColID)
                        return this.myColumns[colnr];
                return null;
            }

            //finds and returns a column definition, providing the column identifier
            that.findColumnRequired = function (iColID) {
                var rs = this.findColumn(iColID);
                if (!rs)
                    throw 'Column id "{id}" not found in query table'.DQXformat({ id: iColID });
                return rs;
            }

            //Adds a new sort option to the table
            //iOption: of type DQX.TableSort
            that.addSortOption = function (iName, iOption) {
                this.mySortOptions.push({ name: iName, Option: iOption });
                this.findColumnRequired(iOption.getPrimaryColumnID()).sortOption = iOption;
            }

            //This function is called by the datafetcher to inform the table that new data is ready
            that.notifyDataReady = function () {
                if (this.myDataFetcher.isValid())
                    this._dataValid = true;
                this.render();
            }

            that._onForward = function () {
                if (this.myTableOffset + this.myPageSize < this.totalRecordCount) {
                    this.myTableOffset += this.myPageSize;
                    this.render();
                }
                return false;
            }

            that._onFirst = function () {
                this.myTableOffset = 0;
                this.render();
                return false;
            }

            that._onBack = function () {
                this.myTableOffset -= this.myPageSize;
                if (this.myTableOffset < 0) this.myTableOffset = 0;
                this.render();
                return false;
            }

            that._onLast = function () {
                this.myTableOffset = (Math.floor((this.totalRecordCount) / this.myPageSize)) * this.myPageSize;
                this.render();
                return false;
            }

            that._onMoreLines = function () {
                that.myPageSize += 1;
                this.render();
                return false;
            }

            that._onLessLines = function () {
                that.myPageSize = Math.max(1, that.myPageSize - 1);
                this.render();
                return false;
            }

            that._onLineUp = function (message2) {
                this.myTableOffset = Math.max(0, this.myTableOffset - message2);
                this.render();
                return false;
            }

            that._onLineDown = function (message2) {
                this.myTableOffset = Math.min(this.totalRecordCount - this.myPageSize + 4, this.myTableOffset + message2);
                this.render();
                return false;
            }

            //Forces a reload of the table information
            that.reLoadTable = function () {
                this.totalRecordCount = -1; //means not yet determined
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this.render();
            }

            //Causes the current table information to be invalidated (does not initiate a reload)
            that.invalidate = function () {
                if (this._dataValid) {
                    this._dataValid = false;
                    this.render();
                }
            }

            //Defines the query that is used to return the table content
            that.setQuery = function (iquery) {
                this.myDataFetcher._userQuery = iquery;
                this._dataValid = true;
            }


            //Renders the table
            that.render = function () {

                var messageHandlers = [];

                var addBitmapButton = function (extensionid, imagefile, description) {
                    messageHandlers.push(extensionid);
                    return '<IMG id=' + that.myBaseID + extensionid + ' SRC="' + imagefile + '" border=0 class="DQXBitmapLink" ALT="' + description + '" TITLE="' + description + '">';
                }

                var row1 = Math.max(0, this.myTableOffset - 200);
                var row2 = this.myTableOffset + this.myPageSize + 200;
                var datacomplete = false;

                if (this._dataValid)
                    datacomplete = this.myDataFetcher.IsDataReady(row1, row2, true);

                this.totalRecordCount = -1;
                if ('totalRecordCount' in this.myDataFetcher)
                    this.totalRecordCount = this.myDataFetcher.totalRecordCount;

                var rs_pager = "";
                var rs_footer = '';
                rs_pager += '<span style="position:relative;bottom:-8px;">';
                rs_pager += addBitmapButton("_onFirst", "Bitmaps/first.png", "First page");
                rs_pager += addBitmapButton("_onBack", "Bitmaps/previous.png", "Previous page");
                rs_pager += addBitmapButton("_onForward", 'Bitmaps/next.png', "Next page");
                if (datacomplete) {
                    rs_pager += addBitmapButton("_onLast", 'Bitmaps/lastpage.png', "Last page");
                }
                rs_pager += "</span>";
                if (datacomplete && this._dataValid) {
                    var downloadlink = this.myDataFetcher.createDownloadUrl();

                    var rightgroup = DocEl.Span();
                    rightgroup.addStyle('float', 'right');
                    rightgroup.addStyle('vertical-align', 'bottom');
                    rightgroup.addStyle('position', 'relative');
                    rightgroup.addStyle('top', '5px');
                    rightgroup.addStyle('right', '5px');
                    rightgroup.addElem('<a href=' + downloadlink + '><IMG class="DQXBitmapLink" SRC=Bitmaps/download.png border=0 title="Download this data as TAB-delimited file" ALT="Download"></a>')
                    rs_pager += rightgroup.toString();
                }

                if (!this.autoSizeHeight) {
                    rs_pager += "&nbsp;&nbsp;";
                    rs_pager += addBitmapButton("_onMoreLines", 'Bitmaps/morelines.png', "More lines on page");
                    rs_pager += "&nbsp;";
                    rs_pager += addBitmapButton("_onLessLines", 'Bitmaps/lesslines.png', "Less lines on page");
                }

                rs_pager += "&nbsp;&nbsp;&nbsp;Current: ";
                rs_pager += (this.myTableOffset + 1) + "-" + (this.myTableOffset + this.myPageSize);

                var rs_table = [];
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    if (this._dataValid)
                        rs_table[tbnr] = '<table class="DQXQueryTable">';
                    else
                        rs_table[tbnr] = '<table class="DQXQueryTable DQXQueryTableInvalid">';

                //write headers
                for (var colnr in this.myColumns) {
                    var thecol = this.myColumns[colnr];
                    var tbnr = thecol.TablePart;
                    rs_table[tbnr] += '<th TITLE="{comment}">'.DQXformat({ comment: thecol.myComment });
                    if (!thecol.Collapsed) {
                        rs_table[tbnr] += thecol.myName;
                        //                        rs_table[tbnr] += '&nbsp;<a onclick=\"QueryTable._reflectOwnMessage(\'' + this.myBaseID + '\',\'Collapse\',\'' + thecol.myCompID + '\')\" href=\"javascript:void(0)\"><</a>'
                    }
                    else {
                        //                      rs_table[tbnr] += '&nbsp;<a onclick=\"QueryTable._reflectOwnMessage(\'' + this.myBaseID + '\',\'Collapse\',\'' + thecol.myCompID + '\')\" href=\"javascript:void(0)\">></a>'
                    }
                    if (thecol._hyperlinkHeaderMessageScope) {
                        var st = '<IMG class="DQXQueryTableLinkHeader" id="{id}" SRC=Bitmaps/link1.png border=0 class="DQXBitmapLink" ALT="Link">'.
                            DQXformat({ id: thecol.myCompID + '~headerlink~' + this.myBaseID });
                        rs_table[tbnr] += ' ' + st;
                    }
                    if (thecol.sortOption) {
                        var bitmapname = "arrow5down.png";
                        if (this.myDataFetcher.positionField == thecol.sortOption.toString()) {
                            if (!this.myDataFetcher.sortReverse)
                                bitmapname = "arrow4down.png";
                            else
                                bitmapname = "arrow4up.png";
                        }
                        var st = '<IMG class="DQXQueryTableSortHeader" id="{id}" SRC=Bitmaps/{bmp} border=0 class="DQXBitmapLink" ALT="Link">'.
                            DQXformat({ id: thecol.myCompID + '~sort~' + this.myBaseID, bmp: bitmapname });
                        rs_table[tbnr] += ' ' + st;
                    }
                    rs_table[tbnr] += "</th>";
                }


                if ((this._dataValid) && (!datacomplete)) rs_pager += '&nbsp;<span style="background-color:rgb(192,0,0);font-weight:bold">FETCHING...</span>';
                else rs_pager += "; Total: " + Math.max(0, this.totalRecordCount);
                if (this.hasFetchFailed) rs_pager += "&nbsp;FETCH FAILED !";

                for (var rownr0 = 0; rownr0 < this.myPageSize; rownr0++) {
                    var rownr = this.myTableOffset + rownr0;
                    /*if (rownr < this.totalRecordCount)*/
                    {
                        var downloadrownr = this.myDataFetcher.findIndexByXVal(rownr);
                        for (var tbnr = 0; tbnr <= 1; tbnr++)
                            rs_table[tbnr] += "<tr>";
                        for (var colnr in this.myColumns) {
                            var thecol = this.myColumns[colnr];
                            var tbnr = thecol.TablePart;
                            var hascontent = false;
                            var cell_color = "white";
                            var cell_content = "&nbsp;";
                            var cell_title = "";
                            if ((this.totalRecordCount < 0) || (rownr < this.totalRecordCount)) cell_content = "?";
                            if (downloadrownr >= 0) {
                                hascontent = true;
                                cell_content = this.myDataFetcher.getColumnPoint(downloadrownr, thecol.myCompID);
                                cell_color = thecol.CellToColor(cell_content);
                                cell_content = thecol.CellToText(cell_content);
                                cell_title = cell_content;
                                if (thecol.Collapsed)
                                    cell_content = "";
                            }
                            rs_table[tbnr] += "<td  TITLE='" + cell_title + "' style='background-color:" + cell_color + "'>";
                            if ((thecol._hyperlinkCellMessageScope) && (hascontent))
                                rs_table[tbnr] += '<a class="DQXQueryTableLinkCell" id="' + thecol.myCompID + '~' + downloadrownr + '~link~' + this.myBaseID + '">';
                            rs_table[tbnr] += cell_content;
                            if ((thecol._hyperlinkCellMessageScope) && (hascontent))
                                rs_table[tbnr] += '</a>';
                            rs_table[tbnr] += "</td>";
                        }
                    }
                    for (var tbnr = 0; tbnr <= 1; tbnr++)
                        rs_table[tbnr] += "</tr>";
                }
                for (var tbnr = 0; tbnr <= 1; tbnr++)
                    rs_table[tbnr] += "</table>";

                this.getElement('Body1')[0].innerHTML = rs_table[0];
                this.getElement('Body2')[0].innerHTML = rs_table[1];
                this.getElement('Pager').html(rs_pager);
                this.getElement('Footer').html(rs_footer);

                for (var i = 0; i < messageHandlers.length; i++) {
                    var id = messageHandlers[i];
                    $('#' + this.myBaseID + id).click($.proxy(that[id], that));
                }
                $('#' + this.myBaseID).find('.DQXQueryTableLinkCell').click($.proxy(that._onClickLinkCell, that));
                $('#' + this.myBaseID).find('.DQXQueryTableLinkHeader').click($.proxy(that._onClickLinkHeader, that));
                $('#' + this.myBaseID).find('.DQXQueryTableSortHeader').click($.proxy(that._onClickSortHeader, that));
            }

            that._onClickLinkCell = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                Msg.send(column._hyperlinkCellMessageScope, parseInt(tokens[1]));
            }

            that._onClickLinkHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                Msg.send(column._hyperlinkHeaderMessageScope, tokens[0]);
            }

            that._onClickSortHeader = function (ev) {
                var tokens = ev.target.id.split('~');
                var column = this.findColumn(tokens[0]);
                //Msg.send(column._hyperlinkHeaderMessageScope, tokens[0]);

                var newPositionField = column.sortOption.toString();
                if (this.myDataFetcher.positionField != newPositionField)
                    this.myDataFetcher.sortReverse = false;
                else
                    this.myDataFetcher.sortReverse = !this.myDataFetcher.sortReverse;
                this.myDataFetcher.positionField = newPositionField;
                this.myDataFetcher.clearData();
                this.myTableOffset = 0;
                this.render();

            }

            //This function is called when a key was pressed
            that.onKeyDown = function (ev) {
                if (ev.keyCode == 40) {//line down
                    this._onLineDown(1);
                    return true;
                }
                if (ev.keyCode == 38) {//line down
                    this._onLineUp(1);
                    return true;
                }
                if (ev.keyCode == 33) {//page up
                    that._onBack();
                    return true;
                }
                if (ev.keyCode == 34) {//page down
                    that._onForward();
                    return true;
                }
                return false;
            }

            that.OnMouseWheel = function (ev) {
                var delta = DQX.getMouseWheelDelta(ev);
                if (delta < 0)
                    this._onLineDown(3);
                if (delta > 0)
                    this._onLineUp(3);
                return false;
            }

            that.onResize = function () {
            }



            //Initialise some event handlers
            that.getElement('Body1').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));
            that.getElement('Body2').bind('DOMMouseScroll mousewheel', $.proxy(that.OnMouseWheel, that));

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////
        // Query table GUI component
        //////////////////////////////////////////////////////////////////////////////////////////


        QueryTable.GUI = function (iid, idatafetcher, args) {
            var that = DQX.Gui.GuiComponent(iid, args);

            var html = '';


            {//Create header
                var header = DocEl.Div();
                header.setCssClass("DQXLight");
                header.addStyle('padding-bottom', '5px');
                var pager_txt = DocEl.Span({ parent: header, id: that.getSubId("Pager") });
                html += header;
            }

            {//Create tables
                var holder = DocEl.Div({ id: that.getSubId("BodyHolder") });
                //holder.addStyle("overflow", "auto");


                //This variant uses a guaranteed fixed % distribution over both parts, and also guarantees that the table stretches the full extent        
                //        var div1 = DocEl.Div({ parent: holder });
                //        div1.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(args.leftfraction || 50);
                //        var tablebody1 = DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
                //        tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                //        tablebody1.addStyle("border-width",'0px');
                //        tablebody1.addStyle("border-right-width", '2px');
                //        tablebody1.addStyle("border-style", 'solid');
                //        tablebody1.addStyle("border-color", 'rgb(60,60,60)');
                //        var div2 = DocEl.Div({ parent: holder });
                //        div2.makeFloatLeft().addStyle('overflow', 'auto').setWidthPc(100 - (args.leftfraction || 50));
                //        var tablebody2 = DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
                //        tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                //        

                //This variant uses a maximum % distribution for the left part, and makes the left part never use more than required. It does not guarantee that the table stretches the full extent        
                var div1 = DocEl.Div({ parent: holder });
                div1.makeFloatLeft().addStyle('overflow', 'auto');
                div1.addStyle('max-width', (args.leftfraction || 50).toString() + '%');
                var tablebody1 = DocEl.Div({ parent: div1, id: that.getSubId("Body1") });
                tablebody1.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                tablebody1.addStyle("border-width", '0px');
                tablebody1.addStyle("border-right-width", '2px');
                tablebody1.addStyle("border-style", 'solid');
                tablebody1.addStyle("border-color", 'rgb(60,60,60)');
                var div2 = DocEl.Div({ parent: holder });
                div2.addStyle('overflow', 'auto'); //.setWidthPc(95);
                var tablebody2 = DocEl.Div({ parent: div2, id: that.getSubId("Body2") });
                tablebody2.addStyle("overflow-x", "scroll").addStyle("overflow-y", "hidden");
                tablebody2.setBackgroundColor(DQX.Color(0.7, 0.7, 0.7));

                html += holder;
            }

            {//Create footer
                var footer = DocEl.Div();
                var footer_txt = DocEl.Span({ parent: footer, id: (that.getSubId("Footer")) });
                footer.addStyle("clear", "both");
                footer.addStyle("padding-top", "3px");
                html += footer;
            }

            that.rootelem.html(html);


            that.myTable = QueryTable.Table(iid, idatafetcher);
            that.myTable.autoSizeHeight = true;

            DQX.setKeyDownReceiver(iid, $.proxy(that.myTable.onKeyDown, that.myTable));

            that.getVerticalUserSize = function () {
                return $('#' + that.getSubId("BodyHolder")).outerHeight() + $('#' + that.getSubId("Pager")).outerHeight() + $('#' + that.getSubId("Footer")).outerHeight(); ;
            }

            that.onResize = function () {
                var availabeH = this.rootelem.innerHeight() - DQX.scrollBarWidth - 15;
                if (availabeH != this.lastAvailabeH) {
                    do {
                        var requiredH = this.getVerticalUserSize();
                        if (requiredH < availabeH)
                            this.myTable._onMoreLines();
                    }
                    while (requiredH < availabeH)
                    do {
                        var requiredH = this.getVerticalUserSize();
                        if (requiredH > availabeH)
                            this.myTable._onLessLines();
                    }
                    while (requiredH > availabeH)
                }
                this.lastAvailabeH = availabeH;
            }


            return that;
        }


        return QueryTable;
    });
      
    

