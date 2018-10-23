/// <reference path="helpers.ts" />

namespace ZoomCharts.Configuration {
    export interface PieChartDataObjectCommon {
        valueArray?: Array<number>;
    }
    export interface FacetChartDataObjectCommon {
        valueArray?: Array<number>;
    }
}

module powerbi.extensibility.visual {
    export class Data {
        private static palettes: ZoomCharts.Dictionary<ColorPaletteWrapper> = {};
        @logExceptions()
        public static convert(visual:Visual, host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            if (isDebugVisual) {
                console.log("Chart data update called", options);
            }

            let root: ZoomCharts.Configuration.PieChartDataObjectRoot = {
                id: "",
                subvalues: [],
                extra: {},
                valueArray: []
            };

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Please select the data fields for the visual.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical) {
                displayMessage(target, "The visual did not receive categorical data.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical.categories) {
                displayMessage(target, "Please select the category field for the visual.", "Incorrect data", false);
                return root;
            }

            if (!dataView.categorical.values) {
                displayMessage(target, "Please select at least one value field for the visual.", "Incorrect data", false);
                return root;
            }         
            
            hideMessage(target);

            const formatter = powerbi.extensibility.utils.formatting.formattingService;
            let values = dataView.categorical.values[0].highlights || dataView.categorical.values[0].values;

            let catCount = dataView.categorical.categories.length;
            let ids: Array<visuals.ISelectionId> = new Array(values.length);
            let parentObjects: Array<ZoomCharts.Configuration.PieChartDataObject> = new Array(values.length);
            let grouper: ZoomCharts.Dictionary<ZoomCharts.Configuration.PieChartDataObject>;
            let allObjects: Array<ZoomCharts.Configuration.PieChartDataObject> = [];
            for (let i = 0; i < values.length; i++) {
                parentObjects[i] = <any>root;
                ids[i] = host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[0], i).createSelectionId();
            }

            if (catCount > 0) {
                root.name = secureString(dataView.categorical.categories[0].source.displayName);
            }

            for (let c = 0; c < catCount; c++) {
                let expandable = c < catCount - 1;
                let categories = dataView.categorical.categories[c];
                grouper = Object.create(null);

                let colorPalette = this.palettes[categories.source.queryName] || (this.palettes[categories.source.queryName] = new ColorPaletteWrapper(createColorPalette(host)));

                for (let i = 0; i < values.length; i++) {
                    let parent = parentObjects[i];
                    let catValue = formatter.formatValue(categories.values[i], categories.source.format);
                    let idVal = parent.id + "\ufdd0" + catValue;
                    let localId = categories.source.queryName + "\ufdd0" + catValue;

                    let obj = grouper[idVal];
                    if (!obj) {
                        let color = getColor(categories, i, "colors" + (c + 1).toFixed(0));
                        if (color) {
                            // reserve the color if "revert to default" is clicked.
                            colorPalette.getColor(localId);
                        } else {
                            color = colorPalette.getColor(localId);
                        }

                        obj = {
                            value: <number>values[i] || 0,
                            valueArray: [<number>values[i] || 0],
                            name: secureString("" + catValue),
                            id: idVal,
                            subvalues: [],
                            style: {
                                expandable: expandable,
                                fillColor: color.value
                            },
                            extra: {s:[ids[i]]}
                        };
                        obj.extra.category = secureString(categories.source.queryName);
                        obj.extra.categoryName = secureString(categories.source.displayName);
                        obj.extra.sortIndex = i;
                        //parent.value += <number>values[i] || 0;
                        //parent.valueArray.push(<number>values[i] || 0)
                        parent.subvalues.push(obj);
                        grouper[idVal] = obj;
                        allObjects.push(obj);
                    } else {
                        obj.extra.s.push(ids[i]);
                        obj.value += <number>values[i] || 0;
                        obj.valueArray.push(<number>values[i] || 0);
                        //parent.value += <number>values[i] || 0;
                        //parent.valueArray.push(<number>values[i] || 0)
                    }

                    // support for multiples values (in FacetChart)
                    for (let v = 1; v < dataView.categorical.values.length; v++) {
                        let aValues = dataView.categorical.values[v].highlights || dataView.categorical.values[v].values;
                        let k = "value" + v.toFixed(0);
                        let ka = k + "Array";
                        if (!obj[ka]) {
                            obj[ka] = [<number>aValues[i] || 0];
                            obj[k] = <number>aValues[i] || 0;
                        } else {
                            obj[ka].push(<number>aValues[i] || 0);
                            obj[k] += <number>aValues[i] || 0;
                        }
                    }

                    parentObjects[i] = obj;
                }
            }

            for (let obj of allObjects) {
                for (let v = 0; v < dataView.categorical.values.length; v++) {
                    let k = v === 0 ? "value" : ("value" + v.toFixed(0));
                    let ka = k + "Array";
                    
                    obj[k] = this.aggregateValue(dataView.categorical.values[v].source, obj[ka]);
                }                
            }
            return root;
        }

        protected static aggregateValue(col: DataViewMetadataColumn, values: number[]) {
            let qn = col.queryName;
            let x: number = (<any>col.expr).func;

            switch (x) {
                default:
                case 0:
                    let sum = 0;
                    for (let v of values) sum += v;
                    return sum;

                case 1:
                    if (values.length === 0) return 0;
                    let avg = 0;
                    for (let v of values) avg += v;
                    return avg / values.length;

                case 3: 
                    return Math.min(...values);
                
                case 4:
                    return Math.max(...values);                
            }
        }

        public static enumerateSlices(objectName: string, depth: number, parent: ZoomCharts.Configuration.PieChartDataObjectCommon, result: VisualObjectInstance[], seenKeys: ZoomCharts.Dictionary<boolean>) {
            if (!parent.subvalues)
                return;

            for (let v of parent.subvalues) {
                if (depth === 0) {
                    let key = v.extra.category + "/" + v.name;
                    if (seenKeys[key])
                        continue;
                    seenKeys[key] = true;
 
                    result.push({
                        objectName: objectName,
                        displayName: secureString(v.name),
                        properties: { fill: { solid: { color: v.style.fillColor } } },
                        selector: v.extra.s[0].getSelector()
                    });
                } else {
                    this.enumerateSlices(objectName, depth - 1, v, result, seenKeys);
                }
            }
        }
    }
    
}
