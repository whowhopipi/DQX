﻿/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/DataDecoders", "DQX/DataFetcher/DataFetcherFile"],
    function ($, SQL, DQX, DataDecoders, DataFetcherFile) {
        var DataFetcherSnp = {}

        DataFetcherSnp.SnpFilterData = function () {
            var that = {};
            that.applyVCFFilter = false;
            that.minPresence = 0;
            that.minSnpCoverage = 1;
            this.requireParentsPresent = false;
            return that;
        }

        DataFetcherSnp.SnpSequence = function (iID) {
            var that = {};
            that.myID = iID;
            return that;
        }


        DataFetcherSnp.Fetcher = function (iserverurl) {
            if (!(this instanceof arguments.callee)) DQX.reportError("Should be called as constructor!");

            this.serverurl = iserverurl; //The server url to contact for this
            this._requestNr = 0;
            this.dataid = null; //not yet assigned
            this._sequenceIDList = [];
            this._parentIDs = [];
            this._myChromoID = '';
            this.decoder = DataDecoders.ValueListDecoder();
            this.b64codec = DataDecoders.B64();

            this._filters = []; // list of filter ids's
            this._activeFilterMap = {}; //set of active filter ID's

            //The currently fetched range of data
            this._currentRangeMin = 1000.0;
            this._currentRangeMax = -1000.0;
            this._autoExtendRange = true;

            //Enables or disables automatic extension of fetch range
            this.setAutoExtendRange = function (status) {
                this._autoExtendRange = status;
            }

            this.setDataSource = function (idataid, callOnCompleted) {
                this.clearData();
                this.dataid = idataid;
                DQX.setProcessing("Downloading...");
                this._callOnCompleted = callOnCompleted;
                this._listSnpPositionInfo = null;
                this._listSampleCallInfo = null;
                DataFetcherFile.getFile(serverUrl, this.dataid + "/_MetaData", $.proxy(this._onFetchMetaInfo, this));
            }

            //sets the list of sequence ID's that should be fetched
            this.setFetchSequenceIDList = function (lst) {
                if (!this._sequenceIDListOriginal)
                    DQX.reportError('[@Snp] fetcher not initialised');
                this._sequenceIDList = [];
                var self = this;
                $.each(lst, function (idx, ID) {
                    if (self._sequenceIDListOriginal.indexOf(ID) < 0)
                        DQX.reportError('Invalid sequence ID');
                    self._sequenceIDList.push(ID);
                });
                this.mySeqs = {};
                for (var i = 0; i < this._sequenceIDList.length; i++) {
                    this.mySeqs[this._sequenceIDList[i]] = DataFetcherSnp.SnpSequence(this._sequenceIDList[i]);
                }
            }

            this._onFetchMetaInfo = function (content) {
                var lines = content.split('\n');
                this._sequenceIDList = [];
                this._parentIDs = [];
                for (var linenr = 0; linenr < lines.length; linenr++) {
                    var line = lines[linenr];
                    var splitPos = line.indexOf('=');
                    if (splitPos > 0) {
                        var token = line.slice(0, splitPos);
                        var content = line.slice(splitPos + 1);
                        if (token == 'Samples')
                            this._sequenceIDList = content.split('\t');
                        if (token == 'Parents')
                            this._parentIDs = content.split('\t');
                        if (token == 'SnpPositionFields') {
                            this._parseSnpPositionFields(content);
                        }
                        if (token == 'SampleCallFields') {
                            this._parseSampleCallFields(content);
                        }
                        if (token == 'Filters') {
                            this._filters = content.split('\t');
                            this._activeFilterMap = {};
                            var self = this;
                            $.each(this._filters, function (idx, filter) {
                                self._activeFilterMap[filter] = false;
                            });
                        }
                    }
                }
                this._sequenceIDListOriginal = [];
                var self = this;
                $.each(this._sequenceIDList, function (idx, ID) {
                    self._sequenceIDListOriginal.push(ID);
                });
                if (!this._listSnpPositionInfo)
                    DQX.reportError("[@Snp] position info is missing");
                this.mySeqs = {};
                for (var i = 0; i < this._sequenceIDList.length; i++) {
                    this.mySeqs[this._sequenceIDList[i]] = DataFetcherSnp.SnpSequence(this._sequenceIDList[i]);
                }
                this._metaInfoPresent = true;
                DQX.stopProcessing();
                this._callOnCompleted();
            }

            this._parseSnpPositionFields = function (content) {
                this._listSnpPositionInfo = JSON.parse(content);
                this._recordLength = 0;
                for (var fnr = 0; fnr < this._listSnpPositionInfo.length; fnr++) {
                    var fieldInfo = this._listSnpPositionInfo[fnr];
                    fieldInfo.getFromServer = true;
                    fieldInfo.decoder = DataDecoders.Encoder.Create(fieldInfo.Encoder);
                    fieldInfo.recordLength = fieldInfo.decoder.getRecordLength();
                    this._recordLength += fieldInfo.recordLength;
                }

                //create mapping
                this.mapSnpPositionInfoNr = [];
                for (var fnr = 0; fnr < this._listSnpPositionInfo.length; fnr++) {
                    this.mapSnpPositionInfoNr[this._listSnpPositionInfo[fnr].ID] = fnr;
                    this._listSnpPositionInfo[fnr].displaySizeY = 30;
                }
            }

            this._parseSampleCallFields = function (content) {
                this._listSampleCallInfo = JSON.parse(content);
                this._sampleCallRecordLength = 0;
                for (var fnr = 0; fnr < this._listSampleCallInfo.length; fnr++) {
                    var fieldInfo = this._listSampleCallInfo[fnr];
                    fieldInfo.decoder = DataDecoders.Encoder.Create(fieldInfo.Encoder);
                    fieldInfo.recordLength = fieldInfo.decoder.getRecordLength();
                    this._sampleCallRecordLength += fieldInfo.recordLength;
                }
            }

            this.getSnPositInfoList = function () {
                if (!this._listSnpPositionInfo) return [];
                return this._listSnpPositionInfo;
            }

            this.getSampleCallInfoList = function () {
                if (!this._listSampleCallInfo) return [];
                return this._listSampleCallInfo;
            }

            this.getSequenceIDList = function () {
                return this._sequenceIDList;
            }

            this.getParentIDs = function () {
                return this._parentIDs;
            }

            this.buffPosits = [];
            this._isFetching = false; //If true, an ajax request was sent out and wasn't finished yet
            this.hasFetchFailed = false; //True if an error occurred while fetching the data

            //sets the active chromosome identifier for this data fetcher
            this.setChromoID = function (iID) {
                this._myChromoID = iID;
                this.clearData();
            }

            //Removes all downloaded data, forcing a reload
            this.clearData = function () {
                this._requestNr++;
                this._currentRangeMin = 1000.0;
                this._currentRangeMax = -1000.0;
                this.buffPosits = [];
                this._isFetching = false;
            }

            this.setFilterActive = function (filterid, newStatus) {
                if (!(filterid in this._activeFilterMap))
                    DQX.reportError("Invalid Snp filter " + filterid);
                this._activeFilterMap[filterid] = newStatus;
                this.clearData();
            }

            //internal
            this._ajaxResponse_FetchRange = function (resp, callback) {
                if (!this._isFetching) return;
                this.hasFetchFailed = false;
                this._isFetching = false;
                var keylist = DQX.parseResponse(resp); //unpack the response

                if ("Error" in keylist) {
                    this.hasFetchFailed = true;
                    //alert(keylist.error);
                    setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
                    return;
                }

                if (keylist.requestnr != this._requestNr) {
                    this.myDataConsumer.notifyDataReady();
                    return;
                }

                if (!this._listSnpPositionInfo)
                    return;


                this.buffPosits = this.decoder.doDecode(keylist['posits']);
                var datalen = this.buffPosits.length;

                //Parse per-position SNP info
                this.buffSnpPosInfo = [];
                for (var infonr = 0; infonr < this._listSnpPositionInfo.length; infonr++)
                    this.buffSnpPosInfo.push([]);
                var snpdata = keylist['snpdata'];
                //                if (snpdata[0]!='A')
                //                    var q=0;
                var posOffset = 0;
                for (var i = 0; i < datalen; i++) {
                    for (var infonr = 0; infonr < this._listSnpPositionInfo.length; infonr++) {
                        var info = this._listSnpPositionInfo[infonr];
                        if (info.getFromServer) {
                            this.buffSnpPosInfo[infonr].push(info.decoder.decodeSingle(snpdata, posOffset));
                            posOffset += info.recordLength;
                        }
                    }
                }


                //Parse per-sample call info
                var seqcount = 0;
                for (smp in this.mySeqs) {
                    var dta = keylist['seqvals'][smp];
                    var sampleCallInfo = [];
                    for (var infonr = 0; infonr < this._listSampleCallInfo.length; infonr++)
                        sampleCallInfo.push([]);
                    var posOffset = 0;
                    for (var i = 0; i < datalen; i++) {
                        for (var infonr = 0; infonr < this._listSampleCallInfo.length; infonr++) {
                            var info = this._listSampleCallInfo[infonr];
                            sampleCallInfo[infonr].push(info.decoder.decodeSingle(dta, posOffset));
                            posOffset += info.recordLength;
                        }
                    }
                    this.mySeqs[smp].sampleCallInfo = sampleCallInfo;
                    seqcount++;
                }


                //update the currently downloaded range
                this._currentRangeMin = parseFloat(keylist["start"]);
                this._currentRangeMax = parseFloat(keylist["stop"]);


                //tell the consumer of this that the data are ready
                if (this.myDataConsumer)
                    this.myDataConsumer.notifyDataReady();
                else
                    callback();
            }

            //internal
            this._ajaxFailure_FetchRange = function (resp) {
                alert('fetch error');
                this.hasFetchFailed = true;
                this._isFetching = false;
                //tell the consumer of this that the data are 'ready'
                //note: this will cause a requery, which is what we want
                //the timout introduces a delay, avoiding that the server is flooded with requeries
                setTimeout($.proxy(this.myDataConsumer.notifyDataReady, this.myDataConsumer), DQX.timeoutRetry);
            }

            //internal: initiates the ajax data fetching call
            this._fetchRange = function (rangemin, rangemax, callback) {

                if (!this._isFetching) {
                    //create some buffer around the requested range. This reduces the number of requests and gives the user a smoother experience when scrolling or zooming out
                    range = rangemax - rangemin;
                    if (this._autoExtendRange) {
                        rangemin -= 1.5 * range;
                        rangemax += 1.5 * range;
                    }
                    var seqids = '';
                    for (seqid in this.mySeqs) {
                        if (seqids.length > 0)
                            seqids += '~';
                        seqids += seqid;
                    }

                    //create list of active filters
                    var activeFilterMask = '';
                    var self = this;
                    $.each(this._filters, function (idx, filterid) {
                        activeFilterMask += (self._activeFilterMap[filterid]) ? '1' : '0';
                    });

                    if (!this._sampleCallRecordLength)
                        DQX.reportError('No information on sample call data');

                    //prepare the url
                    var myurl = DQX.Url(this.serverurl);
                    myurl.addUrlQueryItem("datatype", "snpinfo");
                    myurl.addUrlQueryItem('requestnr', this._requestNr);
                    myurl.addUrlQueryItem("seqids", seqids);
                    myurl.addUrlQueryItem("start", rangemin);
                    myurl.addUrlQueryItem("stop", rangemax);
                    myurl.addUrlQueryItem("chromoid", this._myChromoID);
                    myurl.addUrlQueryItem("folder", this.dataid);
                    myurl.addUrlQueryItem("snpinforeclen", this._recordLength);
                    myurl.addUrlQueryItem("samplecallinforeclen", this._sampleCallRecordLength);
                    myurl.addUrlQueryItem("filters", activeFilterMask);
                    var urlString = myurl.toString();
                    //                    alert(urlString);


                    this._isFetching = true;
                    var thethis = this;
                    $.ajax({
                        url: urlString,
                        success: function (resp) { thethis._ajaxResponse_FetchRange(resp, callback) },
                        error: function (resp) { thethis._ajaxFailure_FetchRange(resp) }
                    });
                }
            }


            //Call this to determine if all data in a specific range is ready, and start fetching extra data if necessary
            this.IsDataReady = function (rangemin, rangemax) {

                if (!this.dataid) return true; //don't fetch anything if the data source is not provided

                if (!this._metaInfoPresent) return true; //don't fetch anything if the metainfo is not provided

                if ((rangemin >= this._currentRangeMin) && (rangemax <= this._currentRangeMax)) {
                    var buffer = (rangemax - rangemin) / 2;
                    if ((rangemin - buffer < this._currentRangeMin) || (rangemax + buffer > this._currentRangeMax)) {
                        this._fetchRange(rangemin, rangemax);
                    }
                    return true;
                }
                else {
                    this._fetchRange(rangemin, rangemax);
                    return false;
                }
            }


            this.pos2BuffIndexLeft = function (pos) {
                var i1 = 0;
                var p1 = this.buffPosits[i1];
                var i2 = this.buffPosits.length - 1;
                var p2 = this.buffPosits[i2];
                while ((p1 < pos) && (i2 > i1 + 1)) {
                    var i3 = Math.floor((i1 + i2) / 2.0);
                    var p3 = this.buffPosits[i3];
                    if (p3 >= pos) {
                        i2 = i3;
                        p2 = p3;
                    }
                    else {
                        i1 = i3;
                        p1 = p3;
                    }
                }
                return i1;
            }

            this.pos2BuffIndexRight = function (pos) {
                var i1 = 0;
                var p1 = this.buffPosits[i1];
                var i2 = this.buffPosits.length - 1;
                var p2 = this.buffPosits[i2];
                while ((p2 > pos) && (i2 > i1 + 1)) {
                    var i3 = Math.ceil((i1 + i2) / 2.0);
                    var p3 = this.buffPosits[i3];
                    if (p3 <= pos) {
                        i1 = i3;
                        p1 = p3;
                    }
                    else {
                        i2 = i3;
                        p2 = p3;
                    }
                }
                return i2;
            }

            this.getSnpInfoRange = function (posMin, posMax, filter, hideFiltered) {
                var rs = { Present: true }

                var posits = [];
                var isFiltered = [];
                var idx1 = this.pos2BuffIndexLeft(posMin);
                var idx2 = this.pos2BuffIndexRight(posMax);

                if (!this.buffSnpPosInfo)
                    return { Present: false };

                //calculate presence fraction for each snp
                var buffPresence = [];
                for (var i = 0; i < idx1; i++)
                    buffPresence.push(0);
                for (var i = idx1; i <= idx2; i++) {
                    var ct = 0;
                    var totct = 0;
                    for (seqid in this.mySeqs) {
                        totct++;
                    }
                    buffPresence.push(ct * 1.0 / totct);
                }

                var buffSnpRefBase = this.buffSnpPosInfo[this.mapSnpPositionInfoNr['RefBase']]
                var buffSnpAltBase = this.buffSnpPosInfo[this.mapSnpPositionInfoNr['AltBase']]
                var buffSnpFilter = this.buffSnpPosInfo[this.mapSnpPositionInfoNr['Filtered']]
                var idxlist = [];
                for (var i = idx1; i <= idx2; i++) {
                    var passed = true;
                    if (buffPresence[i] < filter.minPresence / 100.0)
                        passed = false;
                    if ((filter.applyVCFFilter) && (!buffSnpFilter[i]))
                        passed = false;
                    if (passed || (!hideFiltered)) {
                        idxlist.push(i);
                        posits.push(this.buffPosits[i]);
                        isFiltered.push(passed ? 0 : 1);
                    }
                }
                rs.posits = posits;
                rs.isFiltered = isFiltered;

                rs.SnpPosInfo = [];
                if (this._listSnpPositionInfo) {
                    for (var infonr = 0; infonr < this._listSnpPositionInfo.length; infonr++) {
                        var src = this.buffSnpPosInfo[infonr];
                        var lst = [];
                        for (var i = 0; i < idxlist.length; i++) lst.push(src[idxlist[i]]);
                        rs.SnpPosInfo.push(lst);
                    }
                }
                rs.SnpRefBase = [];
                rs.SnpAltBase = [];
                for (var i = 0; i < idxlist.length; i++) {
                    var ii = idxlist[i];
                    rs.SnpRefBase.push(buffSnpRefBase[ii]);
                    rs.SnpAltBase.push(buffSnpAltBase[ii]);
                }

                var seqdata = {};
                for (seqid in this.mySeqs) {
                    var seq = this.mySeqs[seqid];

                    var seq_sampleCallInfo = [];
                    for (var infonr = 0; infonr < this._listSampleCallInfo.length; infonr++)
                        seq_sampleCallInfo.push([]);
                    for (var i = 0; i < idxlist.length; i++) {
                        var ii = idxlist[i];
                        for (var infonr = 0; infonr < this._listSampleCallInfo.length; infonr++) {
                            seq_sampleCallInfo[infonr].push(seq.sampleCallInfo[infonr][ii]);
                        }
                    }

                    seqdata[seqid] = {}
                    for (var infonr = 0; infonr < this._listSampleCallInfo.length; infonr++) {
                        seqdata[seqid][this._listSampleCallInfo[infonr].ID] = seq_sampleCallInfo[infonr];
                    }

                }
                rs.seqdata = seqdata;

                var extrafilterstep = false;
                if (filter.requireParentsPresent && (this._parentIDs.length == 2)) {
                    extrafilterstep = true;
                    for (var i = 0; i < posits.length; i++) {
                        var parentspresent = true;
                        for (var pnr in this._parentIDs)
                            if (!seqdata[this._parentIDs[pnr]].pres[i])
                                parentspresent = false;
                        if (!parentspresent)
                            isFiltered[i] = true;
                    }
                }

                if ((extrafilterstep) && hideFiltered) {
                    globchannels = [rs.posits, rs.isFiltered, rs.SnpRefBase, rs.SnpAltBase];
                    seqchannelnames = ['cov1', 'cov2', 'pres'];
                    var i2 = 0;
                    for (var i = 0; i < posits.length; i++) {
                        if (!isFiltered[i]) {
                            for (var chnr = 0; chnr < globchannels.length; chnr++)
                                globchannels[chnr][i2] = globchannels[chnr][i];
                            for (var chnr = 0; chnr < rs.SnpPosInfo.length; chnr++)
                                rs.SnpPosInfo[chnr][i2] = rs.SnpPosInfo[chnr][i];
                            for (seqid in this.mySeqs) {
                                for (chnr in seqchannelnames) {
                                    seqdata[seqid][seqchannelnames[chnr]][i2] = seqdata[seqid][seqchannelnames[chnr]][i];
                                }
                            }
                            i2++;
                        }
                    }
                    for (var chnr in globchannels)
                        globchannels[chnr].length = i2;
                    for (var chnr = 0; chnr < rs.SnpPosInfo.length; chnr++)
                        rs.SnpPosInfo[chnr].length = i2;

                    for (seqid in this.mySeqs) {
                        for (chnr in seqchannelnames) {
                            seqdata[seqid][seqchannelnames[chnr]].length = i2;
                        }
                    }
                }

                //add some utilities
                rs._fetcher = this;
                rs.getSnpInfo = function (id) {
                    var channel = this.SnpPosInfo[this._fetcher.mapSnpPositionInfoNr[id]];
                    if (!channel) DQX.reportError('Invalid [@snp] position property ' + id);
                    return channel;
                }

                return rs;
            }
        }

        return DataFetcherSnp;
    });    
    





