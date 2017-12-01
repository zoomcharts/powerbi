module powerbi.extensibility.visual {
    window.ZoomChartsLicense = "ZCF-x33yuxzf8-1: ZoomCharts Custom Visual free licence for use in Microsoft PowerBI Projects (for FacetChart); upgrades until: 2018-03-08"
    window.ZoomChartsLicenseKey = "4d3a4d47a253044154dcc81b3970e97057e98542f68762a0d0"+
        "c5f065e2215d1fe11a000c36e4ae45cc3123a0a41fad4a72c7e80c20d62a6b616d3d740a7af16"+
        "78605d1b2f605266351e6ad4ba76d46a302729d8fab5ae5ac2aa5ee8aef72b01a67fa2a0d5178"+
        "0b399473aee9f077fbe8dc2fdff07676681917f731315452f6128eeae611c07173ad88133a838"+
        "a91ff41e50041d3652f26029d19d0b9732dcf704cdd7d00e9b8c70a339951ac25d0af23f25be9"+
        "4df5437f9ce6751f029e8204525f331da03848621da09ed9e1652735effd07a3013d4820086df"+
        "e9c4f0233be80bbbf2cd4d5ecdafad6331f6961035ae8959e6515d7686ddb97cfff9885657bd9";

    export class Visual implements IVisual {
        protected target: HTMLElement;
        protected chart: ZoomCharts.FacetChart;
        protected ZC: typeof ZoomCharts;
        protected host: IVisualHost;
        protected pendingData: ZoomCharts.Configuration.PieChartDataObjectRoot = { subvalues: [] };
        protected pendingSettings: ZoomCharts.Configuration.FacetChartSettings = {};
        protected updateTimer: number;
        protected colors: IColorPalette;
        protected selectionManager: ISelectionManager;
        protected setLegendState = true;
        protected series: ZoomCharts.Configuration.FacetChartSettingsSeries[] = [];
        protected lastCategorySet: string = null;
        protected customProperties: any = [];
        public betalimitator: any = null;
        public customizationInformer: any = null;
        public viewport: any = null;

        constructor(options: VisualConstructorOptions) {
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

            // this.target.innerHTML = "Loading ZoomCharts. Please wait...";

            ZoomChartsLoader.ensure((zc) => this.createChart(zc), () => {
                displayMessage(this.target, "Cannot load ZoomCharts library. This visual requires internet connectivity.", "Error", true);
            });

            this.betalimitator = new betalimitator(this.target);
            if(this.betalimitator.checkIfExpired()) {
                this.showExpired();
            }

            this.customizationInformer = new customiztionInformer(this.target, this, {
                url: "https://zoomcharts.com/en/microsoft-power-bi-custom-visuals/custom-visuals/drill-down-column-line-area-chart/",
                images: {
                    "600x400": "https://cdn.zoomcharts-cloud.com/assets/power-bi/FC-600x400.png",
                    "500x500": "https://cdn.zoomcharts-cloud.com/assets/power-bi/FC-500x500.png",
                    "400x600": "https://cdn.zoomcharts-cloud.com/assets/power-bi/FC-400x600.png",
                    "300x200": "https://cdn.zoomcharts-cloud.com/assets/power-bi/FC-300x200.png",
                    "200x300": "https://cdn.zoomcharts-cloud.com/assets/power-bi/FC-200x300.png"
                }
            });
            this.customizationInformer.showGetFullVersionLogo();
        }

        public showExpired(){
            displayMessage(this.target, "Trial period for this visual is expired.", "Trial expired", false);
        }

        protected createChart(zc: typeof ZoomCharts) {
            // check if the visual is destroyed before chart is created.
            if (!this.target)
                return;

            this.ZC = zc;

            let chartContainer = document.createElement("div");
            chartContainer.className = "chart-container";
            this.target.appendChild(chartContainer);

            this.chart = new zc.FacetChart({
                container: chartContainer,
                advanced: { themeCSSClass: "DVSL-flat" },
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
                assetsUrlBase: ZoomChartsLoader.RootUrl + "assets/"
            });

            this.chart.replaceSettings(this.pendingSettings);

            this.pendingSettings = null;
            //this.pendingData = null;
        }

        protected updateSeries(istr: string, series: ZoomCharts.Configuration.FacetChartSettingsSeries) {
        }

        protected createSeries(options: VisualUpdateOptions, legendState: boolean = null) {
            let dataView = options.dataViews[0];
            if (!dataView || !dataView.categorical)
                return;

            let values = dataView.categorical.values;
            if (!values || !values.length)
                return;

            let series: ZoomCharts.Configuration.FacetChartSettingsSeriesColumns[] = [];
            for (let i = 0; i < values.length; i++) {
                let column = values[i];
                let istr = (i + 1).toFixed(0);

                for (let role in column.source.roles) {
                    if (role !== "Values") {
                        istr = role.substr(6);
                    }

                    let color = this.colors.getColor("zc-fc-color-" + istr);
                    let s = <ZoomCharts.Configuration.FacetChartSettingsSeriesColumns>{
                        type: "columns",
                        id: "s" + istr,
                        name: secureString(column.source.displayName),
                        extra: { format: column.source.format },
                        data: { field: i === 0 ? "value" : ("value" + i.toFixed(0)) },
                        valueAxis: "primary",
                        style: {
                            fillColor: color.value,
                            gradient: 0,
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
                        sel = sel.concat(selectedSlices[i].extra);
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

        public current_scale:any=1;
        public prev_pixel_ratio:any;
        @logExceptions()
        public update(options: VisualUpdateOptions) {
            updateSize(this, options.viewport);
            if (options.type & VisualUpdateType.Data) {
                this.createSeries(options);
                let root = Data.convert(this, this.host, this.target, options);
                let catStr = this.stringifyCategories(options.dataViews[0]);

                this.viewport = options.viewport;
                
                this.customProperties = options.dataViews[0].metadata.objects;
                
                if (this.chart) {
                    updateScale(options, this.chart);
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
                    let val = getValue(this.customProperties, "customization", "show", null);

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
