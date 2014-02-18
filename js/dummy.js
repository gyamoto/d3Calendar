var hoge = new timePartition();
var ro = { 
	"num":2014,
	"children":[
		{
			"num":1,
			"children":[
				{"num":1, "yet":false},
				{"num":2, "yet":false},
				{"num":3, "yet":true},
				{"num":4, "yet":true},
				{"num":5, "yet":true},
			]
		},
		{
			"num":2,
			"children":[
				{"num":1, "yet":false}
				{"num":2, "yet":false}
				{"num":3, "yet":true}
			]
		},
		{
			"num":3,
			"children":[
				{"num":1, "yet":true}
				{"num":2, "yet":true}
				{"num":3, "yet":true}
			]
		}
	]
};
hoge.update(ro)