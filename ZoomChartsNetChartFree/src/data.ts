module powerbi.extensibility.visual {
    export class Data {
        public static convert(host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            if (isDebugVisual) {
                console.log("Chart data update called", options);
            }

            let root: ZoomCharts.Configuration.NetChartDataObject = {
                nodes: [],
                links: []
            };
            let ids: Array<visuals.ISelectionId>;

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Either the data loading is taking longer than usual or the data fields for the visual are not properly configured.", "Incorrect data", false);
                return root;
            }

            hideMessage(target);

            if (isDebugVisual) {
                console.log(dataView);
            }

            let categories = dataView.categorical.categories.length;
            let values = dataView.categorical.categories[0].values.length;

            let nodeMap = [];
            let linkMap = [];
            let nodeId;
            let colorMap = [
                "#2fc32f",
                "#b0dc0b",
                "#eab404",
                "#de672c",
                "#ec2e2e",
                "#d5429b"
            ];
            for (let y = 0; y < categories; y++){
                nodeMap[y] = {};
            }
            for (let x = 0; x < values; x++){
                for (let y = 0; y < categories; y++){
                    let v = dataView.categorical.categories[y].values[x];
                    let nodeId = y + ":" + v;
                    let value;
                    if (typeof(dataView.categorical.values) != "undefined"){
                        value = dataView.categorical.values[0].values[x];
                    }

                    if (typeof(value) != "number"){
                        value = 1; // count
                    }

                    if (typeof(nodeMap[y][nodeId]) === "undefined"){
                        nodeMap[y][nodeId] = {
                            name: v,
                            id: x,
                            depth: y,
                            value: 0
                        };
                        root.nodes.push({id: nodeId, extra: nodeMap[y][nodeId], loaded: true, style: {fillColor: colorMap[y]}});
                    }
                    if (y > 0){
                        let f = (y-1) + ":" + dataView.categorical.categories[y-1].values[x];
                        let t = nodeId;
                        let lid = f + "-" + t;
                        if (linkMap.indexOf(lid) < 0){
                            linkMap.push(lid);
                            root.links.push({
                                id: lid,
                                from: f,
                                to: t
                            });
                        }
                    }
                    if (y == categories - 1){
                        // update the values for the "Branch"
                        for (let z = 0; z <= y; z++){
                            nodeMap[z][z+":"+dataView.categorical.categories[z].values[x]].value += value;
                        }
                    }
                }
            }
            if (isDebugVisual) {
                console.log(root);
            }

            return root;
        }
    }
}
