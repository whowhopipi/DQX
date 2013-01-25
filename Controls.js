﻿define([DQXSC("Msg"), DQXSC("DocEl"), DQXSC("Scroller"), DQXSC("Documentation")],
    function (Msg, DocEl, Scroller, Documentation) {
        var Controls = {};

        Controls.CompoundHor = function (icontrols) {
            var that = {};
            that._legend = '';
            that._controls = icontrols;

            that.setLegend = function (txt) {
                this._legend = txt;
                return this;
            }

            that.clear = function () {
                that._controls = [];
            }

            that.addControl = function (item) {
                that._controls.push(item);
                return item;
            }

            that.getID = function () {
                if (this._controls.length == 0) DQX.reportError('Compound control has no components');
                return this._controls[0].getID(id);
            }

            that.setContextID = function (id) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].setContextID(id);
            }


            that.modifyEnabled = function (newstate) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].modifyEnabled(id);
            }


            that.renderHtml = function () {
                var st = '';
                if (this._legend.length > 0) {
                    st += '<fieldset class="DQXFormFieldSet">';
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++)
                    st += this._controls[i].renderHtml();
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                return st;
            }

            that.postCreateHtml = function () {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].postCreateHtml(id);
            }

            that.findControl = function (id) {
                for (var i = 0; i < this._controls.length; i++) {
                    var rs = this._controls[i].findControl(id);
                    if (rs != null) return rs;
                }
                return null;
            }

            return that;
        }


        Controls.CompoundVert = function (icontrols) {
            var that = {};
            that._legend = '';
            that._controls = [];
            that._margin = 3;
            if (icontrols)
                that._controls = icontrols;

            that.setLegend = function (txt) {
                this._legend = txt;
                return this;
            }

            that.clear = function () {
                that._controls = [];
            }

            that.addControl = function (item) {
                that._controls.push(item);
                return item;
            }

            that.getID = function () {
                if (this._controls.length == 0) DQX.reportError('Compound control has no components');
                return this._controls[0].getID(id);
            }

            that.setContextID = function (id) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].setContextID(id);
            }


            that.modifyEnabled = function (newstate) {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].modifyEnabled(id);
            }


            that.renderHtml = function () {
                var st = '';
                if (this._legend.length > 0) {
                    st += '<fieldset class="DQXFormFieldSet">';
                    st += '<legend>' + this._legend + '</legend>';
                }
                for (var i = 0; i < this._controls.length; i++) {
                    var el = DocEl.Div({});
                    el.addStyle('margin-top', this._margin + 'px');
                    el.addStyle('margin-bottom', this._margin + 'px');
                    el.addElem(this._controls[i].renderHtml());
                    st += el.toString();
                }
                if (this._legend.length > 0) {
                    st += '</fieldset>';
                }
                return st;
            }

            that.postCreateHtml = function () {
                for (var i = 0; i < this._controls.length; i++)
                    this._controls[i].postCreateHtml(id);
                setTimeout(function () {
                    for (var i = 0; i < that._controls.length; i++)
                        if (that._controls[i]._hasDefaultFocus)
                            that._controls[i].setFocus();
                }, 200);
            }

            that.findControl = function (id) {
                for (var i = 0; i < this._controls.length; i++) {
                    var rs = this._controls[i].findControl(id);
                    if (rs != null) return rs;
                }
                return null;
            }

            return that;
        }



        Controls.CompoundGrid = function () {
            var that = {};
            that._controlRows = [];
            that.sepH = 12;
            that.sepV = 5;

            that.clear = function () {
                that._controlRows = [];
            }

            that.setItem = function (rowNr, colNr, item) {
                while (this._controlRows.length <= rowNr)
                    this._controlRows.push([]);
                while (this._controlRows[rowNr].length <= colNr)
                    this._controlRows[rowNr].push(null);
                this._controlRows[rowNr][colNr] = item;
            }

            that.getItem = function (rowNr, colNr) {
                if ((rowNr < 0) || (rowNr >= this._controlRows.length))
                    return null;
                if ((colNr < 0) || (colNr >= this._controlRows[rowNr].length))
                    return null;
                return this._controlRows[rowNr][colNr];
            }

            that._loopItems = function (fnc) {
                for (var rowNr = 0; rowNr < this._controlRows.length; rowNr++)
                    for (var colNr = 0; colNr < this._controlRows[rowNr].length; colNr++)
                        if (this._controlRows[rowNr][colNr] != null)
                            fnc(this._controlRows[rowNr][colNr]);
            }


            that.getID = function () {
                if (!this.getItem(0, 0)) DQX.reportError('Compound control has no components');
                return this.getItem(0, 0).getID(id);
            }

            that.setContextID = function (id) {
                this._loopItems(function (it) { it.setContextID(id); });
            }


            that.modifyEnabled = function (newstate) {
                this._loopItems(function (it) { it.modifyEnabled(id); });
            }


            that.renderHtml = function () {
                var st = '<table style="padding-top:{pt}px;">'.DQXformat({ pt: this.sepV });
                for (var rowNr = 0; rowNr < this._controlRows.length; rowNr++) {
                    st += '<tr>';
                    for (var colNr = 0; colNr < this._controlRows[rowNr].length; colNr++) {
                        st += '<td style="padding-right:{sepH}px;padding-bottom:{sepV}px;">'.DQXformat({ sepH: this.sepH, sepV: this.sepV });
                        var item = this.getItem(rowNr, colNr);
                        if (item != null)
                            st += item.renderHtml();
                        st += '</td>';
                    }
                    st += '</tr>';
                }
                st += '</table>';
                return st;
            }

            that.postCreateHtml = function () {
                this._loopItems(function (it) { it.postCreateHtml(); });
            }

            that.findControl = function (id) {
                this._loopItems(function (it) {
                    var rs = it.findControl(id);
                    if (rs != null) return rs;
                });
                return null;
            }


            return that;
        }




        //////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Label = function (icontent) {
            var that = {};
            that._content = icontent;

            that.getID = function () { return ''; }

            that.setContextID = function (id) {
            }


            that.modifyEnabled = function (newstate) {
            }


            that.renderHtml = function () {
                return this._content;
            }

            that.postCreateHtml = function () {
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Control = function (iid) {
            var that = {};
            that.myID = iid;
            that.myContextID = '';
            that._enabled = true;
            that._controlExtensionList = [];
            that._hasDefaultFocus = false;

            that.setHasDefaultFocus = function () {
                this._hasDefaultFocus = true;
                return this;
            }

            that.getID = function () { return this.myID; }

            that.getFullID = function (extension) {
                return this.myContextID + this.myID + extension;
            }

            that._reactModifyValue = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyValue(value);
                }
            }
            Msg.listen('ModifyValue' + that.getFullID(''), { type: 'CtrlModifyValue', id: that.myID }, $.proxy(that._reactModifyValue, that));


            that._reactModifyEnabled = function (scope, value) {
                if (scope.contextid == this.myContextID) {
                    this.modifyEnabled(value);
                }
            }
            Msg.listen('ModifyEnabled' + that.getFullID(), { type: 'CtrlModifyEnabled', id: that.myID }, $.proxy(that._reactModifyEnabled, that));


            that.setContextID = function (id) {
                if ((this.myContextID != '') && (this.myContextID !== id))
                    DQX.reportError('Control context id is already set');
                this.myContextID = id;
            }



            that.getJQElement = function (extension) {
                return $('#' + this.getFullID(extension));
            }

            that.modifyEnabled = function (newstate) {
                this._enabled = newstate;
                for (var i = 0; i < this._controlExtensionList.length; i++) {
                    if (this._enabled)
                        this.getJQElement(this._controlExtensionList[i]).removeAttr('disabled');
                    else
                        this.getJQElement(this._controlExtensionList[i]).attr("disabled", "disabled");
                }
            }

            that.addValueChangedListener = function (handler) {
                Msg.listen('', { type: 'CtrlValueChanged', id: this.getID() }, handler);
            }

            that.setOnChanged = function (handler) {//provide a handler function that will be called when the control changes
                this.onChanged = handler;
                return this;
            }

            that._notifyChanged = function () {
                if (this.onChanged)
                    this.onChanged(this.myID, this);
                Msg.broadcast({ type: 'CtrlValueChanged', id: this.myID, contextid: this.myContextID }, this);
            }

            that.findControl = function (id) {
                if (id == this.myID) return this;
                else return null;
            }

            that.setFocus = function () {
                //this.getJQElement('').focus();
                document.getElementById(this.getFullID('')).focus();
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Static = function (content) {
            var that = Controls.Control('');
            that.myContent = content;
            that._isComment = false;

            that.makeComment = function () { this._isComment = true; return this; }

            that._controlExtensionList.push('');

            that.renderHtml = function () {
                var lb = DocEl.Div();
                lb.addStyle("padding-top", "2px");
                lb.addStyle("padding-bottom", "2px");
                lb.addStyle('display', 'inline-block');
                if (this._isComment)
                    lb.setCssClass("DQXFormComment");
                lb.addElem(this.myContent);
                return lb.toString();
            }

            that.postCreateHtml = function () {
            }

            that._onChange = function () {
            }

            that.getValue = function () {
                return null;
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Html = function (iid, content) {
            var that = Controls.Control(iid);
            that.myContent = content;

            that._controlExtensionList.push('');

            that.renderHtml = function () {
                var lb = DocEl.Div({ id: this.getFullID('') });
                lb.addStyle("padding-top", "2px");
                lb.addStyle("padding-bottom", "2px");
                lb.addStyle('display', 'inline-block');
                lb.addElem(this.myContent);
                return lb.toString();
            }

            that.postCreateHtml = function () {
            }

            that._onChange = function () {
            }

            that.getValue = function () {
                return null;
            }

            that.modifyValue = function (newContent) {
                that.myContent = newContent;
                this.getJQElement('').html(newContent);
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Check = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'label');
            that.myLabel = args.label;
            that.isChecked = false;
            if (args.value)
                that.isChecked = args.value;
            that._hint = false;
            if (args.hint)
                that._hint = args.hint;

            that._controlExtensionList.push('');

            that.renderHtml = function () {
                var chk = DocEl.Check({ id: this.getFullID('') });
                if (this.hint)
                    chk.addHint(this.hint);
                if (that.isChecked)
                    chk.addAttribute('checked', "checked");
                var label = DocEl.Label({ target: this.getFullID('') });
                if (this._hint)
                    label.addHint(this._hint);
                label.addElem(this.myLabel);
                return chk.toString() + label.toString();
            }

            that.postCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                var lastval = this.isChecked;
                var newval = this.getValue();
                if (newval != lastval) {
                    this.isChecked = newval;
                    this._notifyChanged();
                }
            }

            that.getValue = function () {
                this.isChecked = this.getJQElement('').is(':checked');
                return this.isChecked;
            }

            that.modifyValue = function (newstate) {
                if (newstate == this.getValue()) return;
                this.isChecked = newstate;
                if (this.isChecked)
                    this.getJQElement('').attr('checked', 'checked');
                else
                    this.getJQElement('').removeAttr('checked');
                this._notifyChanged();
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Button = function (iid, args) {
            var that = Controls.Control(iid);
            if (!args.content) DQX.reportError("No button content provided");
            that.content = args.content;
            that._controlExtensionList.push('');
            if (args.hint)
                that._hint = args.hint;
            that._buttonClass = 'DQXWizardButton'; // "DQXToolButton1"
            if (args.buttonClass)
                that._buttonClass = args.buttonClass;
            if (args.width)
                that._width = args.width;

            that.renderHtml = function () {
                var bt = DocEl.Div({ id: this.getFullID('') });
                if (this._hint)
                    bt.addHint(this._hint);
                bt.addStyle('display', 'inline-block');
                //bt.addStyle('position', 'absolute');
                bt.setCssClass(this._buttonClass);
                bt.addElem(that.content);
                if (this._width)
                    bt.setWidthPx(this._width);
                return '&nbsp;&nbsp;' + bt.toString();
            }

            that.postCreateHtml = function () {
                this.getJQElement('').mousedown($.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._notifyChanged();
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Hyperlink = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'content');
            that.content = args.content;
            that._controlExtensionList.push('');
            if (args.hint)
                that._hint = args.hint;

            that.renderHtml = function () {
                var bt = DocEl.Div({ id: this.getFullID('') });
                if (this._hint)
                    bt.addHint(this._hint);
                bt.addStyle('display', 'inline-block');
                bt.setCssClass("DQXHyperlink");
                bt.addElem(that.content);
                bt.addStyle("padding-top", "2px");
                bt.addStyle("padding-bottom", "2px");
                return bt.toString();
            }

            that.postCreateHtml = function () {
                this.getJQElement('').mousedown($.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._notifyChanged();
            }

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Edit = function (iid, args) {
            var that = Controls.Control(iid);
            that.myLabel = args.label;
            that.value = '';
            if ('value' in args)
                that.value = args.value;
            that.size = 6;
            if ('size' in args)
                that.size = args.size;
            if (args.hint)
                that._hint = args.hint;

            that._controlExtensionList.push('');

            that.renderHtml = function () {
                var edt = DocEl.Edit(that.value, { id: this.getFullID('') });
                if (this._hint)
                    edt.addHint(this._hint);
                edt.addAttribute('size', that.size);
                edt.addAttribute('name', this.getFullID(''));
                var rs = '';
                if (this.myLabel) {
                    var label = DocEl.Label({ target: this.getFullID('Label') });
                    label.addElem(this.myLabel);
                    rs = label.toString() + ' ';
                }
                return rs + edt.toString();
            }

            that.postCreateHtml = function () {
                this.getJQElement('').bind("propertychange keyup input paste", $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                var lastval = this.value;
                var newval = this.getValue();
                if (newval != lastval) {
                    this.value = newval;
                    this._notifyChanged();
                }
            }

            that.getValue = function () {
                this.value = this.getJQElement('').val();
                return this.value;
            }

            that.modifyValue = function (newvalue) {
                if (newvalue == this.getValue()) return;
                this.value = newvalue;
                this.getJQElement('').val(newvalue);
                this._notifyChanged();
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.Combo = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'label');
            DQX.requireMember(args, 'states');
            that.myLabel = args.label;
            that.myStates = args.states;
            that._selectedState = '';
            if ('value' in args)
                that._selectedState = args.value;
            if (args.hint)
                that._hint = args.hint;

            that._controlExtensionList.push('');

            that._buildStatesMap = function () {
                this._statesMap = {};
                for (var i = 0; i < this.myStates.length; i++)
                    this._statesMap[this.myStates[i].id] = this.myStates[i].name;
            }
            that._buildStatesMap();

            that.isState = function (id) {
                if (!('_statesMap' in this)) return false;
                return (id in this._statesMap);
            }


            that._buildSelectContent = function () {
                var st = '';
                for (var i = 0; i < this.myStates.length; i++)
                    st += '<option value="{id}" {selected}>{name}</option>'.DQXformat({
                        id: this.myStates[i].id,
                        name: this.myStates[i].name,
                        selected: (this.myStates[i].id == this._selectedState) ? 'selected="selected"' : ''
                    });
                return st;
            }

            that.renderHtml = function () {
                var cmb = DocEl.Create('select', { id: this.getFullID('') });
                if (this._hint)
                    cmb.addHint(this._hint);
                cmb.addElem(this._buildSelectContent());
                var label = DocEl.Label({ target: this.getFullID('Label') });
                label.addElem(this.myLabel);
                return label.toString() + ' ' + cmb.toString();
            }

            that.postCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._selectedState = this.getValue();
                this._notifyChanged();
            }

            that.getValue = function () {
                this._selectedState = this.getJQElement('').find(":selected").attr('value');
                return this._selectedState;
            }

            that.modifyValue = function (newstate) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state');
                this._selectedState = newstate;
                this.getJQElement('').val(this._selectedState);
                this._notifyChanged();
            }


            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.LinkButton = function (iid, args) {
            var that = Controls.Control(iid);
            that.myBitmap = args.bitmap;
            that.description = '';
            that._hint = '';
            if (args.hint)
                that._hint = args.hint;
            that._vertShift = 0;
            if (args.vertShift)
                that._vertShift = args.vertShift;
            that._controlExtensionList.push('');

            that.renderHtml = function () {
                var st = '<IMG id="{id}" SRC="' + this.myBitmap + '" border=0 class="DQXBitmapLink" ALT="{desc1}" TITLE="{desc2}" style="margin-bottom:{shift}px" align="middle">';
                st = st.DQXformat(
                { id: this.getFullID(''), desc1: that.description, desc2: that._hint, shift: (-this._vertShift) });
                return st;
            }

            that.postCreateHtml = function () {
                var target = 'mousedown.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onClick, that));
            }

            that._onClick = function () {
                this._notifyChanged();
            }

            that.getValue = function () {
                return "";
            }

            that.modifyValue = function (newstate) {
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.HelpButton = function (iid, args) {
            args.bitmap = DQXBMP('info4.png');
            //args.vertShift = 3;
            var that = Controls.LinkButton(iid,args);

            that.setOnChanged(function () {
                Documentation.showHelp('LNK'+this.myID);
            })
            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.RadioGroup = function (iid, args) {
            var that = Controls.Control(iid);
            DQX.requireMember(args, 'states');
            that.myLabel = args.label;
            that.myStates = args.states;
            that._selectedState = '';
            if ('value' in args)
                that._selectedState = args.value;
            if (args.hint)
                that._hint = args.hint;

            that._controlExtensionList.push('');

            that._buildStatesMap = function () {
                this._statesMap = {};
                for (var i = 0; i < this.myStates.length; i++)
                    this._statesMap[this.myStates[i].id] = this.myStates[i].name;
            }
            that._buildStatesMap();

            that.isState = function (id) {
                if (!('_statesMap' in this)) return false;
                return (id in this._statesMap);
            }


            that._buildSelectContent = function () {
                var st = '';
                for (var i = 0; i < this.myStates.length; i++) {
                    var stateid = /*this.getFullID('') + '_' + */this.myStates[i].id;
                    st += '<div style="padding:5px">';
                    st += '<input type="radio" name={controlid} id={id2} value="{id}" {selected}></input>'.DQXformat({
                        controlid: this.getFullID(''),
                        id: stateid, id2: stateid,
                        selected: (this.myStates[i].id == this._selectedState) ? 'checked="yes"' : ''
                    });
                    st += '<label for="{id}">{title}</label>'.DQXformat({
                        id: stateid,
                        title: this.myStates[i].name
                    });
                    st += "</div>";
                }
                return st;
            }

            that.renderHtml = function () {
                var cmb = DocEl.Div({ id: this.getFullID('') });
                cmb.addElem(this._buildSelectContent());
                /*                var label = DocEl.Label({ target: this.getFullID('Label') });
                label.addElem(this.myLabel);*/
                return cmb.toString();
            }

            that.postCreateHtml = function () {
                var target = 'change.controlevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));
            }

            that._onChange = function () {
                this._selectedState = this.getValue();
                this._notifyChanged();
            }

            that.getValue = function () {
                this._selectedState = this.getJQElement('').find(":checked").attr('value');
                return this._selectedState;
            }

            that.modifyValue = function (newstate) {
                if (newstate == this.getValue()) return;
                if (!this.isState(newstate))
                    DQX.reportError('Invalid combo box state');
                this._selectedState = newstate;
                this.getJQElement('').val(this._selectedState);
                this._notifyChanged();
            }


            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.List = function (iid, args) {
            var that = Controls.Control(iid);
            that._width = 300;
            that._height = 200;
            if ('width' in args)
                that._width = args.width;
            if ('height' in args)
                that._height = args.height;
            that._checkList = false;
            if ('checkList' in args)
                that._checkList = args.checkList;
            that._allowSelectItem = true;
            if ('allowSelectItem' in args)
                that._allowSelectItem = args.allowSelectItem;
            that._items = [];
            that._activeItem = null;

            that._controlExtensionList.push('');

            that._getLineID = function (itemID) {
                return this.getFullID('_item_' + itemID);
            }
            that._getCheckID = function (itemID) {
                return this.getFullID('_check_' + itemID);
            }

            that._renderItems = function () {
                var lst = '';
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    var line = DocEl.Div({ id: this._getLineID(item.id) });
                    //line.setID(item.id);
                    if (this._activeItem == item.id)
                        line.setCssClass('DQXLargeListItemSelected');
                    else
                        line.setCssClass('DQXLargeListItem');
                    if (this._checkList) {
                        var checkArea = DocEl.Div({ parent: line });
                        checkArea.addStyle('float', 'left');
                        checkArea.addStyle('margin-right', '7px');
                        var chk = DocEl.Check({ id: this._getCheckID(item.id), parent: checkArea });
                        if (item.checked)
                            chk.addAttribute('checked', "checked");
                    }
                    line.addElem(item.content);
                    lst += line.toString();
                }
                return lst;
            }

            that.setItems = function (lst, activeItem) {
                this._items = lst;
                this._itemsMap = {};
                for (var nr = 0; nr < this._items.length; nr++)
                    this._itemsMap[this._items[nr].id] = this._items[nr];
                if (typeof activeItem != 'undefined')
                    this._activeItem = activeItem;
                this.getJQElement('').html(this._renderItems());
            }

            that.findItem = function (itemID) {
                if (!this._itemsMap)
                    DQX.reportError('List items not initialised');
                var rs = this._itemsMap[itemID];
                if (!rs)
                    DQX.reportError('Item not present in the list: ' + itemID);
                return rs;
            }

            that.renderHtml = function () {
                var dv = DocEl.Div({ id: this.getFullID('') });
                dv.setCssClass('DQXFormControl');
                dv.addStyle('overflow-y', 'auto');
                if (this._width > 0)
                    dv.setWidthPx(this._width);
                else
                    dv.addStyle('width', '100%');
                dv.setHeightPx(this._height);
                dv.addElem(this._renderItems());
                return dv.toString();
            }

            that.postCreateHtml = function () {
                var target = 'mousedown.itemevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChange, that));

                var target = 'change.itemevent';
                this.getJQElement('').unbind(target).bind(target, $.proxy(that._onChangeCheck, that));

            }

            that._event2ListItem = function (ev) {
                rs = { itemID: null, inCheckBox: false };
                var ctrlID = ev.target.id;
                if (ctrlID == '')
                    ctrlID = $(ev.target).parent().attr('id');
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    if ((ctrlID == this._getLineID(item.id)) || (ctrlID == this._getCheckID(item.id))) {
                        rs.itemID = item.id;
                        if (ctrlID == this._getCheckID(item.id))
                            rs.inCheckBox = true;
                    }
                }
                return rs;
            }

            that._onChangeCheck = function (ev) {
                var itemID = this._event2ListItem(ev).itemID;
                if (itemID) {
                    this.findItem(itemID).checked = $('#' + this._getCheckID(itemID)).is(':checked');
                    this._notifyChanged();
                }
            }

            that._onChange = function (ev) {
                var info = this._event2ListItem(ev)
                var itemID = info.itemID;
                if (itemID) {
                    if (this._allowSelectItem) {
                        this.modifyValue(itemID);
                    }
                    else {
                        if (!info.inCheckBox) {
                            var elem = $('#' + this._getCheckID(itemID));
                            var isChecked = checked = elem.is(':checked');
                            if (!isChecked)
                                elem.attr('checked', 'checked');
                            else
                                elem.removeAttr('checked');
                            this._notifyChanged();
                        }
                    }
                }
            }

            that.getValue = function () {
                return this._activeItem;
            }

            that.modifyValue = function (newvalue) {
                if (this._activeItem)
                    this.getJQElement('').children('#' + this._getLineID(this._activeItem)).addClass('DQXLargeListItem').removeClass('DQXLargeListItemSelected');
                this.getJQElement('').children('#' + this._getLineID(newvalue)).removeClass('DQXLargeListItem').addClass('DQXLargeListItemSelected');
                this._activeItem = newvalue;
                this._notifyChanged();
            }

            that.getCheckedItems = function () {
                var items = [];
                for (var i = 0; i < this._items.length; i++) {
                    var item = this._items[i];
                    if ($('#' + this._getCheckID(item.id)).is(':checked'))
                        items.push(item.id);
                }
                return items;
            }

            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        Controls.ValueSlider = function (iid, args) {
            var that = Controls.Control(iid);
            that._width = 300; if ('width' in args) that._width = args.width;
            that._height = 25; if ('height' in args) that._height = args.height;
            DQX.requireMember(args, 'label');
            that._label = args.label;
            DQX.requireMember(args, 'minval');
            DQX.requireMember(args, 'maxval');
            that._minval = args.minval;
            that._maxval = args.maxval;
            that._value = that._minval; if (args.value) that._value = args.value;
            that.digits = 0; if (args.digits) that.digits = args.digits;

            that._controlExtensionList.push('Canvas');

            that.renderHtml = function () {
                st = '<div style="width:{width}px">'.DQXformat({ width: this._width });
                st += '<span >{content}</span>'.DQXformat({ content: that._label });
                st += '<span id="{id}" style="float:right">1</span>'.DQXformat({ id: this.getFullID('Value') });
                st += "</div>";

                st += '<div><canvas id="{id}" width="{width}"  height="{height}"></canvas></div>'.DQXformat({ id: this.getFullID('Canvas'), width: this._width, height: this._height });
                return st;
            }

            that.postCreateHtml = function () {
                this._scroller = Scroller.HScrollBar(this.getFullID('Canvas'));
                this._scroller.myConsumer = this;
                this._scroller.zoomareafraction = 0.001;
                this._scroller.setRange(this._minval, this._maxval);
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.02);
                this._scroller.draw();
            };

            that.scrollTo = function () {
                this._value = (this._scroller.rangeMin + this._scroller.scrollPos * (this._scroller.rangeMax - this._scroller.rangeMin));
                $('#' + this.getFullID('Value')).text(this._value.toFixed(this.digits));
                this._notifyChanged();
            };


            that.getValue = function () {
                return this._value;
            };

            that.modifyValue = function (newvalue) {
                if (newvalue == this.getValue()) return;
                this._value = newvalue;
                $('#' + this.getFullID('Value')).text(this._value.toFixed(this.digits));
                this._scroller.setValue((this._value - this._minval) / (this._maxval - this._minval), 0.02);
                this._scroller.draw();
                this._notifyChanged();
            };

            return that;
        }



        return Controls;
    });
