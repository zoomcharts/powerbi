module powerbi.extensibility.visual {
    export class Data {
        public static convert(host: IVisualHost, target: HTMLElement, options: VisualUpdateOptions) {
            if (isDebugVisual) {
                console.log("Chart data update called", options);
            }

            let root = {
                nodes: [],
                links: [],
                classes: [],
                format: null
            };
            let ids: Array<visuals.ISelectionId>;

            let dataView = options.dataViews[0];
            if (!dataView) {
                displayMessage(target, "Either the data loading is taking longer than usual or the data fields for the visual are not properly configured.", "Incorrect data", false);
                return root;
            }

            hideMessage(target);

            if (typeof(dataView.categorical.categories) == "undefined"){
                return root;
            }

            let categories = dataView.categorical.categories.length;
            let values = dataView.categorical.categories[0].values.length;

            let nodeMap = [];
            let linkMap = [];
            let nodeId;
            let colorMap = [
                "#01b8aa",
                "#fd7976",
                "#f6da5e",
                "#00b8cf",
                "#374649",
                "#b37fa8",
                "fea57d",
                "53a8c2",
                "778183"
            ];
            for (let y = 0; y < categories; y++){
                nodeMap[y] = {};
                root.classes.push({
                    className: "l" + y,
                    nameLegend: dataView.categorical.categories[y].source.displayName,
                    style: {
                        fillColor: colorMap[y]
                    }
                });
            }
            let format = dataView.categorical.values[0].source.format;
            root.format = format;
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
                    let sid:any = host.createSelectionIdBuilder().withCategory(dataView.categorical.categories[y], x).createSelectionId();
                    if (typeof(nodeMap[y][nodeId]) === "undefined"){
                        nodeMap[y][nodeId] = {
                            name: v,
                            id: x,
                            depth: y,
                            value: 0,
                            selectionIds:[]
                        };
                        root.nodes.push({id: nodeId, extra: nodeMap[y][nodeId], loaded: true, className: "l" + y});
                    }
                    nodeMap[y][nodeId].selectionIds.push(sid);

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
            let min = 1.0e12;
            let max = -min;

			function compare(a,b) {
                min = Math.min(min, a.extra.value);
                min = Math.min(min, b.extra.value);
                max = Math.max(max, a.extra.value);
                max = Math.max(max, b.extra.value);
				return a.extra.value - b.extra.value;
			}
			root.nodes = root.nodes.sort(compare);
			
	        /*
             * Group nodes in "ranges"
             * */
            let mode = "dynamic";
            let base = 21;
            let max_gain = 300;
            if (mode == "group"){
                let steps = 6;
                let step = 50;
                let nodes_in_step = Math.round(root.nodes.length / steps);
                for (let x = 0; x < root.nodes.length; x++){
                    root.nodes[x].extra.radius = Math.floor(x / nodes_in_step)*step + base;
                }
            } else if (mode == "dynamic"){
                let range = max-min;
                for (let x = 0; x < root.nodes.length; x++){
                    root.nodes[x].extra.radius = base + (root.nodes[x].extra.value-min)/max * max_gain;
                }
            }
            return root;
        }
    }
}
