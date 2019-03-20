module powerbi.extensibility.visual {
    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.FacetChart;
        protected ZC: any;
        public host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        protected pendingSettings: ZoomCharts.Configuration.FacetChartSettings = {};
        protected updateTimer: number;
        protected primaryAxisFormatString: string = "\$#,0;(\$#,0);\$#,0";
        protected secondaryAxisFormatString: string = "\$#,0;(\$#,0);\$#,0";
        protected colors: IColorPalette;
        protected selectionManager: ISelectionManager;
        protected setLegendState = true;
        protected series: ZoomCharts.Configuration.FacetChartSettingsSeries[] = [];
        protected lastCategorySet: string = null;
        protected customPropertiesFree: any = [];
        public betalimitator: any = null;
        public customizationInformer: any = null;
        public viewport: any = null;
        public currentScale: any = 1;

        constructor(options: VisualConstructorOptions) {
            version = "v1.3.0";
            releaseDate = "Mar 20, 2019";
            visualType = "advanced-column-chart";
            visualName = "Advanced Column Chart Visual";
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

            let settings:any = {
                container: chartContainer,
                advanced: {themeCSSClass: "DVSL-flat" },
                data:
                [{
                    preloaded: this.pendingData,
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
                    onSelectionChange: (e, args) => this.updateSelection(args, 200),
                    onChartUpdate: (e, args) => {
                        if (args.origin === "user")
                            this.updateSelection(args, 500);
                    },
                    onClick: (e,args) => {
                        handleCreditClick(this.host, e,args, "facetchart");
                    }
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
                facetAxis: {
                    defaultUnitWidth: 10,
                    maxUnitWidth: 200
                },
                toolbar: {
                    export: false
                },
                assetsUrlBase: "/"
            };

            if (visualMode == "free"){
                addFreeVersionLogo(settings);
            }
            if (onBeforeCreate){
                settings = onBeforeCreate(settings);
            }

            this.chart = new zc.FacetChart(settings);

            /*this.chart.replaceSettings(this.pendingSettings);

            this.pendingSettings = null;*/
            hideMessage();
            //this.pendingData = null;
        }

        protected updateSeries(istr: string, series: ZoomCharts.Configuration.FacetChartSettingsSeries) {
        }

        @logExceptions()
        protected createSeries(options: VisualUpdateOptions, legendState: boolean = null) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: Array<any> = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = (i + 1).toFixed(0);

                for (let role in column.source.roles) {
                    if (role !== "Values") {
                        istr = role.substr(6);
                    }

                    let color = this.colors.getColor("zc-fc-color-" + istr);
                    /* in paid version series can be also line
                     * <ZoomCharts.Configuration.FacetChartSettingsSeriesColumns>*/
                    let s:any={
                        type: "columns",
                        id: "s" + istr,
                        name: secureString(column.source.displayName),
                        extra: { format: column.source.format },
                        data: { field: i === 0 ? "value" : ("value" + i.toFixed(0)) },
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

            let settings: ZoomCharts.Configuration.FacetChartSettings = {
                series: series,
                legend: this.setLegendState ? { enabled: series.length > 1 } : void 0,
            }

            if (this.chart) {
                this.chart.replaceSettings(settings);
            } else {
                this.pendingSettings = settings;
            }
        }
        @logExceptions()
        protected updateSelection(args: ZoomCharts.Configuration.FacetChartChartEventArguments, delay: number) {
            if (this.updateTimer) window.clearTimeout(this.updateTimer);
            let selman = this.selectionManager;
            let selectedSlices = (args.selection || []).map(o => o.data);
            if (!selectedSlices.length && args.facet.id && args.facet.data) {
                selectedSlices = args.facet.data.values;
            }

            window.setTimeout(() => {
                if (selectedSlices.length) {
                    let sel: visuals.ISelectionId[] = [];
                    for (let i = 0; i < selectedSlices.length; i++) {
                        sel = sel.concat(selectedSlices[i].extra.s);
                    }

                    let cursel = selman.getSelectionIds();
                    if (!arraysEqual(cursel, sel, (a: any, b: any) => a.key === b.key)) {
                        selman.clear();
                        selman.select(sel, false);
                    } else if (isDebugVisual) {
                        console.log("Selection not being updated because getSelectionIds() matches the requested selection. It is possible that the selection is not actually being applied in some cases because of what seems to be a bug in PowerBI.");
                    }
                } else {
                    selman.clear();
                }
            }, delay);
        }

        protected stringifyCategories(dataview: DataView) {
            if (!dataview) return null;
            if (!dataview.categorical) return null;

            let categories = dataview.categorical.categories;
            if(!categories) return null;

            let res = "";
            for (let c of categories) {
                res += "///" + c.source.queryName;
            }
            return res;
        }

        @logExceptions()
        public update(options: VisualUpdateOptions) {
            updateSize(this, options.viewport, options.viewMode);
            if (visualMode == "free"){
                this.customizationInformer.updateImage(options.viewport);
            }
            if (options.type & VisualUpdateType.Data) {
                this.createSeries(options);
                let root = Data.convert(this, this.host, this.target, options);
                let catStr = this.stringifyCategories(options.dataViews[0]);

                this.viewport = options.viewport;
                
                this.customPropertiesFree = options.dataViews[0].metadata.objects;
                
                if (this.chart) {
                    let state = (<any>this.chart)._impl.scrolling.getState();
                    this.chart.replaceData(root);
                    if (this.lastCategorySet !== catStr)
                        this.chart.setPie([""], 0);
                    else
                        this.chart.setPie(state.idArray, state.offset, state.count);

                    this.pendingData = root;
                } else {
                    this.pendingData = root;
                }
                this.lastCategorySet = catStr;
            }
            this.chart.updateSettings({advanced:{highDPI: 2}});
            this.chart.updateSize();
        }

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
