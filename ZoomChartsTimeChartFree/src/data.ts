module powerbi.extensibility.visual {
    export class Data {
        public static convert(host: IVisualHost, options: VisualUpdateOptions) {
            let root: ZoomCharts.Configuration.TimeChartDataObject = {
                from: 0,
                to: 0,
                unit: "d",
                values: [],
                extra: null
            };

            let dataView = options.dataViews[0];
            if (!dataView) {
                console.warn("No data received");
                return root;
            }

            if (!dataView.categorical) {
                console.warn("non-categorical data retrieved");
                return root;
            }

            if (!dataView.categorical.categories) {
                console.warn("no category field selected");
                return root;
            }

            if (!dataView.categorical.values) {
                console.warn("no value field selected");
                return root;
            }

            let timeCat = dataView.categorical.categories[0];
            let times = timeCat.values;
            let valueCat = dataView.categorical.values;

            let ids: Array<visuals.ISelectionId> = new Array(times.length);
            for (let i = 0; i < times.length; i++) {
                ids[i] = host.createSelectionIdBuilder().withCategory(timeCat, i).createSelectionId();
            }

            let hasSeconds = false;
            let hasMinutes = false;
            let hasHours = false;
            let hasDays = false;
            let hasMonths = false;

            let convValues = new Array<[number[]]>(times.length);
            for (let i = 0; i < times.length; i++) {
                let x = new Array<number>(valueCat.length + 2);
                x[x.length - 1] = i;

                let d = <Date>times[i];
                if (d.getSeconds() !== 0) hasSeconds = true;
                if (d.getMinutes() !== 0) hasMinutes = true;
                if (d.getHours() !== 0) hasHours = true;
                if (d.getDate() !== 1) hasDays = true;
                if (d.getMonth() !== 1) hasMonths = true;

                x[0] = d.valueOf();

                for (let v = 0; v < valueCat.length; v++) {
                    let aValues = valueCat[v];
                    x[v + 1] = <number>aValues.values[i];
                }

                root.values.push(x);
            }

            if (!hasSeconds && !hasMinutes && !hasHours) {
                // normalize to UTC as the dates are given in the local timezone
                for (let i = 0; i < times.length; i++) {
                    let d = <Date>times[i];
                    root.values[i][0] = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
                }
            }

            root.values.sort((a,b) => <number>a[0] - <number>b[0]);

            root.extra = ids;
            root.unit = hasSeconds ? "s" : hasMinutes ? "m" : hasHours ? "h" : hasDays ? "d" : hasMonths ? "M" : "y";
            root.from = root.values[0][0];
            root.to = <number> root.values[root.values.length - 1][0] + 1;

            return root;
        }
    }
}