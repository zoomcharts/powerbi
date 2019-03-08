module powerbi.extensibility.visual {
    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.TimeChart;
        protected ZC:any;
        public host: IVisualHost;
        protected dataObj: ZoomCharts.Configuration.TimeChartDataObject = { from: 0, to: 1, dataLimitFrom: 0, dataLimitTo: 1, unit: "s", values: [] };
        protected dataIds: ISelectionId[] = [];
        protected dataSourceIdentity: string = "";
        protected pendingSettings: ZoomCharts.Configuration.TimeChartSettings = {};
        protected updateTimer: number;
        protected primaryAxisFormatString: string = "#,0.00";
        protected secondaryAxisFormatString: string = "#,0.00";
        protected lastTimeRange: [number, number] = [null, null];
        protected colors: IColorPalette;
        protected selectionManager: ISelectionManager;
        protected setLegendState = true;
        protected series: ZoomCharts.Configuration.TimeChartSettingsSeries[] = [];
        protected customPropertiesFree: any = [];
        public customizationInformer: any = null;
        public viewport: any = null;
        protected initialDisplayUnitSet: boolean = false;
        protected currentProps: any;
        protected hasMeasure:boolean=false;
        protected currentDisplayUnits:any=[];
        private currentDu:any = [];
        public currentScale: any = 1;

        constructor(options: VisualConstructorOptions) {
            version = "v1.2.0.1";
            releaseDate = "Mar 8, 2019";
            visualType = "advanced-time-chart";
            visualName = "Advanced Timeline Chart Visual";
            this.target = options.element;
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();

            // if possible, use our own color palette because the default gets its colorIndex reset
            // to 0 when data changes. This results in the colors repeating as new series are added
            this.colors = createColorPalette(this.host);

            // workaround for the host not calling `destroy()` when the visual is reloaded:
            if ((<any>this.target).__zc_visual) {
                (<any>this.target).__zc_visual.destroy();
            }

            (<any>this.target).__zc_visual = this;

            this.chart = null;

            displayMessage(this.target, "ZoomCharts Power BI Custom Visual", "Loading. Please wait.");

            appendZCCss(this.target);
            if (visualMode == "free"){
                setupCustomizationInformer(this);
            }
            this.createChart(window);
            if (isDebugVisual){
                console.log("Chart added", this.chart);
            }
        }
        @logExceptions()
        protected createChart(zc:any, onBeforeCreate?: ((settings:any)=>any) ) {
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;

            this.ZC = zc;
            
            let chartContainer = document.createElement("div");
            chartContainer.className = "chart-container";
            this.target.appendChild(chartContainer);

            let settings = {
                container: chartContainer,
                assetsUrlBase: "/",
                area: {
                    displayUnits: [
                        { unit: "1 ms", name: "millisecond" },
                        { unit: "1 s", name: "second" },
                        { unit: "5 s", name: "5 seconds" },
                        { unit: "1 m", name: "minute" },
                        { unit: "5 m", name: "5 minutes" },
                        { unit: "1 h", name: "hour" },
                        { unit: "6 h", name: "6 hours" },
                        { unit: "1 d", name: "day" },
                        { unit: "1 M", name: "month" },
                        { unit: "3 M", name: "quarter" },
                        { unit: "1 y", name: "year" }
                    ]
                },
                data:
                [{
                    units: [this.dataObj.unit],
                    preloaded: this.dataObj,
                    suppressWarnings: true
                }],
                info: {
                    valueFormatterFunction: (values, series) => {
                        if (!values) return "-";
                        return powerbi.extensibility.utils.formatting.valueFormatter.format(
                            values[series.data.aggregation],
                            series.extra.format);
                    }
                },
                interaction: {
                    selection: { enabled: true },
                    resizing: { enabled: false }
                },
                events: {
                    onClick: (e, args) => {
                        handleCreditClick(this.host, e,args, "timechart");
                        if (e.ctrlKey && args.hoverStart) {
                            this.chart.selection(args.hoverStart, args.hoverEnd);
                            e.preventDefault();
                            return;
                        }
                        let du = this.chart.displayUnit();
                        if (this.dataObj && args.hoverStart && du === "1 " + this.dataObj.unit) {
                            if (args.selectionStart === args.hoverStart && args.selectionEnd === args.hoverEnd) {
                                this.chart.selection(null, null);
                            } else {
                                this.chart.selection(args.hoverStart, args.hoverEnd);
                            }
                            e.preventDefault();
                        }
                    },
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        //if (args.origin === "user")
                        //    this.updateSelection(args, 500);
                    }
                },
                currentTime: {
                    enabled: false
                },
                toolbar: {
                    export: false
                },
                timeAxis: {
                    timeZone: "local"
                },
                valueAxisDefault: {
                    enabled: false
                },
                valueAxis: {
                    "primary": {
                        side: "left",
                        enabled: true
                    },
                    "secondary": {
                        side: "right",
                        enabled: false
                    }
                },
            };
            if (visualMode == "free"){
                addFreeVersionLogo(settings);
            }
            if (onBeforeCreate){
                settings = onBeforeCreate(settings);
            }
            this.chart = new zc.TimeChart(settings);
            hideMessage();
        }
        @logExceptions()

        protected updateSeries(istr: string, series: ZoomCharts.Configuration.TimeChartSettingsSeries) {
        }

        @logExceptions()
        protected getValueAggregation(col: DataViewMetadataColumn): "sum" | "avg" | "max" | "min" | "first" | "last" {
            let qn = col.queryName;
            let x: number = (<any>col.expr).func; // this is a not supported feature and should not be relied on

            switch (x) {
                //case undefined: return "avg";
                default: return "sum";
                case 0: return "sum";
                case 1: return "avg";
                case 3: return "min";
                case 4: return "max";
            }
        }
        @logExceptions()
        protected createSeries(options: VisualUpdateOptions, legendState: boolean = null) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: ZoomCharts.Configuration.TimeChartSettingsSeriesColumns[] = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = (i + 1).toFixed(0);

                for (let role in column.source.roles) {
                    if (role !== "Values") {
                        istr = role.substr(6);
                    }


                    let color = this.colors.getColor("zc-fc-color-" + istr);
                    let s = <ZoomCharts.Configuration.TimeChartSettingsSeriesColumns>{
                        type: "columns",
                        id: "s" + istr,
                        name: secureString(column.source.displayName),
                        extra: { format: column.source.format },
                        data: { index: i + 1, aggregation: this.getValueAggregation(column.source) },
                        valueAxis: "primary",
                        style: {
                            fillColor: color.value,
                            gradient: 0,
                            legend: {
                                marker: {
                                    shape: null
                                }
                            }
                        }
                    };
                    this.updateSeries(istr, s);

                    series.push(s);
                }

                series.sort((a, b) => {
                    let x = (a.extra.zIndex || 0) - (b.extra.zIndex || 0);
                    if (x === 0)
                        x = a.id.localeCompare(b.id);
                    return x;
                });
            }

            setAxisFormatting(series, this);

            this.series = series;

            let settings: ZoomCharts.Configuration.TimeChartSettings = {
                series: series,
            };
            if (visualMode == "free"){
                settings.legend = this.setLegendState ? { enabled: series.length > 1 } : void 0;
            }
            if (this.chart) {
                this.chart.replaceSettings(settings);
                this.chart.clearHistory();
            } else {
                this.pendingSettings = settings;
            }
        }

        @logExceptions()
        protected updateSelection(args: ZoomCharts.Configuration.TimeChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);

            window.setTimeout(() => {
                let selman = this.selectionManager;

                var time = this.chart.selection();
                //if (time[0] == null)
                //    time = this.chart.targetTime();

                if (!this.dataObj)
                    return;

                if (this.lastTimeRange[0] === time[0] && this.lastTimeRange[1] === time[1])
                    return;

                this.lastTimeRange = time;

                if (time[0] === null || (time[0] <= this.dataObj.from && time[1] >= this.dataObj.to)) {
                    selman.clear();
                } else {
                    let ids = [];
                    for (let i = 0; i < this.dataObj.values.length; i++) {
                        let v = this.dataObj.values[i];
                        let t = <number>v[0];

                        //if (t >= time[0] && t < time[1]) continue;
                        if (t < time[0]) continue;
                        if (t >= time[1]) break;

                        ids.push(this.dataIds[v[v.length - 1]]);
                    }

                    let cursel = selman.getSelectionIds();
                    if (!arraysEqual(cursel, ids, (a: any, b: any) => a.key === b.key)) {
                        selman.clear();
                        selman.select(ids, false);
                    } else if (isDebugVisual) {
                        console.log("Selection not being updated because getSelectionIds() matches the requested selection. It is possible that the selection is not actually being applied in some cases because of what seems to be a bug in PowerBI.");
                    }
                }
            }, delay);
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            updateSize(this, options.viewport, options.viewMode);
            if (visualMode == "free"){
                this.customizationInformer.updateImage(options.viewport);
            }
            let map = {
                "d": "day",
                "M": "month",
                "m": "minute",
                "y": "year",
                "s": "second",
                "ms": "millisecond",
                "h": "hour"
            };
            if (options.type & VisualUpdateType.Data) {
                this.chart.updateSize();
                hideMessage();
                this.createSeries(options);
                let root = Data.convert(this, this.host, this.target, options);

                let lastDataObj = this.dataObj;
                let lastDataSource = this.dataSourceIdentity;
                this.dataObj = root.data;
                this.dataIds = root.ids;
                this.dataSourceIdentity = createDataSourceIdentity(options.dataViews[0]);

                this.viewport = options.viewport;

                this.customPropertiesFree = options.dataViews[0].metadata.objects;

                if (this.chart) {

                    let sel = this.chart.selection();
                    this.chart.updateSettings({data: [{units: [root.data.unit]}]});
                    this.chart.replaceData(root.data);
                    if (this.dataSourceIdentity !== lastDataSource) {
                        let unit = new this.ZC.ZoomCharts.Internal.TimeChart.TimeStep(root.data.unit, 1);
                        this.chart.time(<number>root.data.from, unit.add(<number>root.data.to, 1), false);

                        unit = (<any>this.chart)._impl.scene.displayUnit;
                        this.chart.time(unit.roundTimeDown(<number>root.data.from), unit.roundTimeUp(<number>root.data.to), false);
                    }
                    this.chart.selection(sel[0], sel[1]);
                    let du:any = null;
                    let unitsChanged:boolean = false;
                    du = this.getSelectedDisplayUnits(this.currentProps);
                    if (du.length != this.currentDu.length){
                        unitsChanged = true;
                    }

                    if (root.isMeasure && !this.hasMeasure){
                        let unit = "";
                        if (typeof(map[root.data.unit]) != "undefined"){
                            unit = map[root.data.unit];
                        } else {
                            unit = root.data.unit;
                        }
                        this.hasMeasure = true;
                        this.chart.displayUnit("1 " + root.data.unit);
                        this.chart.updateSettings({area:{displayUnits: [{unit: "1 " + root.data.unit, name: unit}]}});
                    } else if (!root.isMeasure && (this.hasMeasure || unitsChanged)){
                        this.hasMeasure = false;
                        if (visualMode == "free"){
                            du = [
                                { unit: "1 ms", name: "millisecond" },
                                { unit: "1 s", name: "second" },
                                { unit: "5 s", name: "5 seconds" },
                                { unit: "1 m", name: "minute" },
                                { unit: "5 m", name: "5 minutes" },
                                { unit: "1 h", name: "hour" },
                                { unit: "6 h", name: "6 hours" },
                                { unit: "1 d", name: "day" },
                                { unit: "1 M", name: "month" },
                                { unit: "3 M", name: "quarter" },
                                { unit: "1 y", name: "year" }
                            ];
                        }
                        this.chart.updateSettings({area: {displayUnits: du}});
                    }
                    this.currentDu = du;


                    /*
                    if (lastDataObj && lastDataObj.dataLimitTo === 1) {
                        this.chart.time(<number>root.data.from, <number>root.data.to, false);
                    } else {
                        let ct = this.chart.time();
                        if (ct[0] !== null) {
                            this.chart.time(Math.max(ct[0], <number>root.data.from), Math.min(ct[1], <number>root.data.to), false);
                        }
                    }
                    */
                }
                
                //it seems that updating navigation. properties here is too late and so
                //a workaround needs to be used. Even so, sometimes after updating displayUnit,
                //chart doesn't receive new property value, so we need to check when displayUnit
                // is the one that we actually need. After desired value is set, don't do this
                // anymore.
                if (!this.initialDisplayUnitSet) {
                    this.chart.displayUnit(this.currentProps.displayUnits.initialDisplayUnit, false);
                    let self = this;
                    setTimeout(()=>{this.chart.setDisplayPeriod("max", "newestData");}, 100);
                    this.initialDisplayUnitSet = true;
                }
            }
            this.chart.updateSettings({advanced:{highDPI: 2}});
        }
        public getSelectedDisplayUnits(props:any){}
        @logExceptions()
        public destroy(): void {
            this.target = null;
            if (this.chart) {
                this.chart.remove();
                this.chart = null;
            }
        }

        @logExceptions()
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch (objectName) {
                case 'customization':
                    let val = getValue(this.customPropertiesFree, "customization", "show", null);

                    let isInfoVisible = this.customizationInformer.isDialogVisible();
                    if(val == true && !isInfoVisible && !this.customizationInformer.initialCheck) {
                        this.customizationInformer.hideDialog();
                        val = false;
                    } else if(val == true) {
                        this.customizationInformer.displayDialog();
                    } else {
                        this.customizationInformer.hideDialog();
                    }

                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            show: val
                        },
                        selector: null
                    });

            }
            return objectEnumeration;
            /*
            return [{
                objectName: objectName,
                properties: <any>vals,
                validValues: validValues,
                selector: null
            }];
            */
        }
    }
}
