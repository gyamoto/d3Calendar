function ready() {
	calendar = new timePartition();
	show();
}

function show() {
	var now = new Date();
	var years = now.getYear();
	if(years<1900) { years += 1900; }
	var months = now.getMonth() + 1;
	var dates = now.getDate();
	var days = now.getDay();
	var hours = now.getHours();
	var minutes = now.getMinutes();
	var seconds = now.getSeconds();

	var times = { "num": years,"children":new Array(12) };
	for(var i = 0; i<times.children.length; i++) {
		times.children[i] = {"num":i+1, "children":new Array(new Date(years, i+1, 0).getDate()) };
		for(var j = 0; j<times.children[i].children.length; j++) {
			times.children[i].children[j] = { "num": j, "yet":(new Date(years, i, j+1) > new Date()) };
		}
	}

	console.log(times);
	calendar.update(times);
}


// http://bl.ocks.org/mbostock/5944371
function timePartition()  {
	this.margin = {top:400, right:400, bottom:400, left:400};
	this.radius = 200;
	this.minRadius = 100;
	this.arcs = 3;

	this.hue = [
		'#8B90BE', '#5496CC', '#43A6CA', '#41C0BA', '#3DB680', '#98D257',
		'#EDF05A', '#F8D557', '#EEAC5B', '#DF6561', '#C55A9E', '#A66FBA'
	];
	this.luminance = d3.scale.sqrt().domain([0, 1e6]).clamp(true).range([90, 20]);

	this.ready = function() {
		var self = this;
		this.svg = d3.select("svg")
			.attr("width", this.margin.left + this.margin.right).attr("height", this.margin.top + this.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")").attr("class", "partition");

		this.partition = d3.layout.partition()
			.sort(function(a,b) { return d3.ascending(a.num, b.num); }).size([2*Math.PI, this.radius]);
		this.arc = d3.svg.arc()
			.startAngle(function(d) { return d.x; })
			.endAngle(function(d) { return d.x + d.dx - 0.01 / (d.depth + 0.5); })
			.innerRadius(function(d) { return self.minRadius + self.radius * Math.sqrt(d.depth - 1); })
			.outerRadius(function(d) { return self.minRadius + self.radius * Math.sqrt(d.depth) - 1; });
	}
	this.ready();

	this.update = function(root, undefined) {
		var self = this;

		this.partition.value(function(d) { return d.children===undefined ? 1 : 0; })
			.nodes(root)
			.forEach(function(d) {
				d._children = d.children;
				d.sum = d.value;
				d.key = key(d);
				d.fill = d.yet ? "#eee" : fill(d);
				d.per = getPercentage(d);
			});

		this.partition.children(function(d, depth) { return depth < self.arcs ? d._children : null; })
			.value(function(d) { return d.sum; });

		this.info = this.svg.append("g").attr("id", "info");
		this.info.append("text").attr("class", "sub").attr("text-anchor", "middle").attr("font-size", "24").attr("y", "-10px").text("partition");
		this.info.append("text").attr("class", "main").attr("text-anchor", "middle").attr("font-size", "42").attr("y", "30px").text("calendar");

		this.center = this.svg.append("circle").attr("r", this.minRadius).on("click", zoomOut);
		this.center.append("title").text("zoom out");

		this.path = this.svg.selectAll("path").data(this.partition.nodes(root).slice(1))
			.enter().append("path").attr("d", this.arc)
				.style("fill", function(d) { return d.fill; })
				.each(function(d) { this._current = updateArc(d); })
				.on("click", zoomIn);

		this.balloon = this.svg.append("g");

		function zoomIn(p) {
			if(p.depth > 1) { p = p.parent;}
			if(!p.children){return};
			var main = (p.per * 100).toFixed(1) + "%", sub = p.parent.num + " / " + p.num;
			zoom(p, p, main, sub);
		}

		function zoomOut(p) {
			if(!p.parent){return};
			var main = (p.parent.per * 100).toFixed(1) + "%", sub = p.parent.num;
			zoom(p.parent, p, main, sub);
		}

		function zoom(root, p, main_info, sub_info) {
			if(document.documentElement.__transition__) { return; }
			var enterArc, exitArc, outsideAngle = d3.scale.linear().domain([0, 2*Math.PI]);

			function insideArc(d) {
				return Number(p.key) > Number(d.key) ? {depth: d.depth - 1,	x: 0,						dx: 0}
						 : Number(p.key) < Number(d.key) ? {depth: d.depth - 1,	x: 2 * Math.PI,	dx: 0}
						 :																 {depth: 0,						x: 0 ,					dx: 2 * Math.PI};
			}

			function outsideArc(d) {
				return {depth: d.depth + 1, x: outsideAngle(d.x), dx: outsideAngle(d.x + d.dx) - outsideAngle(d.x)};
			}

			self.center.datum(root);

			if (root === p){ enterArc = outsideArc, exitArc = insideArc, outsideAngle.range([p.x, p.x + p.dx]); }
			self.path = self.path.data(self.partition.nodes(root).slice(1), function(d) { return d.key; });
			if(root !== p) { enterArc = insideArc, exitArc = outsideArc, outsideAngle.range([p.x, p.x + p.dx]); }

			d3.transition().duration(d3.event.altKey ? 7500 : 750).each(function() {
				self.path.exit().transition()
					.style("fill-opacity", function(d) { return d.depth===1 + (root===p) ? 1 : 0; })
					.attrTween("d", function(d) {
						return arcTween.call(this, exitArc(d));
					})
					.remove();
				self.path.enter().append("path")
					.style("fill-opacity", function(d) { return d.depth===2 - (root===p) ? 1 : 0; })
					.style("fill", function(d) { return d.fill; })
					.on("click", zoomIn)
					.each(function(d) { this._current = enterArc(d); });
				self.path.transition()
					.style("fill-opacity", 1)
					.attrTween("d", function(d) {
						return arcTween.call(this, updateArc(d));
					});

				self.info.select(".main").transition().duration(250).style("opacity", 0)
					.transition().text(main_info)
					.transition().duration(250).style("opacity", 1);
				self.info.select(".sub").transition().duration(250).style("opacity", 0)
					.transition().text(sub_info)
					.transition().duration(250).style("opacity", 1);
			});
		}

		function key(d) {
			var k = [], p = d;
			while(p.depth > 0) { k.push(p.num); p = p.parent; }
			return k.reverse().join(".");
		}

		function fill(d) {
			var p = d;
			while(p.depth > 1) { p = p.parent; }
			var c = d3.lab(self.hue[p.num % self.hue.length]);
			c.l = self.luminance(d.sum);
			return c;
		}

		function arcTween(b) {
			var i = d3.interpolate(this._current, b);
			this._current = i(0);
			return function(t) {
				return self.arc(i(t));
			};
		}

		function updateArc(d) {
			return {depth: d.depth, x: d.x, dx:d.dx};
		}

		function getPercentage(d) {
			var n = 0, p = 0;
			if(d.children == undefined) { return; }
			d.children.forEach(function(c) {
				if(c.value != undefined) { n++; }
				if(!c.yet) { p++; }

				if(c.children != undefined) {
					c.children.forEach(function(cc) {
						if(cc.value != undefined) { n++;}
						if(!cc.yet) { p++; }
					});
				}
			});
			return p / n;
		}

	}

}