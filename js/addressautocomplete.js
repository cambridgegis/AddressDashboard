generateSearchTree = function(aItems) {
	if (aItems.length == 2) {
		return [ [ aItems[0], aItems[1] ], [ aItems[1], aItems[0] ] ];
	}
	var searchTree = [];
	for (var i = 0; i < aItems.length; i++) {
		var item = aItems[i];
		var remaining = aItems.slice(0);
		remaining.splice(i,1);
		var subTree = generateSearchTree(remaining);
		for (var j = 0; j < subTree.length; j++) {
			searchTree.push( [item].concat(subTree[j]) );
		}
	}
	return searchTree;
};

addressAutocomplete = function(selector, queryURL, selectCallback) {
	// selector must point to an <input> and jQuery UI must be loaded
	$(selector)
		.autocomplete({
		"autoFocus" : true,
		"minLength" : 2,
		"open": function(event, ui) {
			$(this).autocomplete("widget").addClass("complete-list");
		},
		"source" : function (request,response) {
			var data = {
				"outFields" : "*",
				"f" : "pjson"
			};
		
			if (request.term.indexOf(" ") !== -1) {
				var aTerms = request.term.split(" ");
				var aSearchTree = generateSearchTree(aTerms);
				var aQueries = [];
				for (var i = 0; i < aSearchTree.length; i++) {
					aQueries.push("( Search_Addr like '%" + aSearchTree[i].join("%") + "%')");
				}
				data.where = aQueries.join(" OR ");
				//console.log(data.where);
			} else {
				data.where = "Search_Addr like '%"+request.term+"%'";
			}
		
			jQuery.ajax({
				"url": queryURL,
				"dataType":"jsonp",
				"data" : data,
				"success" :function (data) {
					data.features.sort(function(obj1, obj2) {
						if (obj1.attributes.StName.toUpperCase() == obj2.attributes.StName.toUpperCase()) {
							return parseInt(obj1.attributes.StNm) - parseInt(obj2.attributes.StNm);
						} else {
							return (obj1.attributes.StName.toUpperCase() > obj2.attributes.StName.toUpperCase() ? 1 : -1);
						}
					});
					response ( $.map (data.features, function (item) {
						return {
							label: item.attributes.Full_Addr,
							value: item.attributes.Full_Addr,
							data: item
						};
					}));
				
				}
			});
		
		},select : function (event, ui) {
			//console.log(ui, ui.item, event, this);
			var data = ui.item.data;
			// start our assorted requests
			//console.log(data);
			

			//CAMBRIDGEMA.resultCache = {};
			selectCallback(data);
		}

	}).data( "autocomplete" )._renderItem = function( ul, item ) {
		return $( "<li></li>" )
			.css({"font-size":"12px"})
			.data( "item.autocomplete", item )
			.append( "<a>"+ item.label + "</a>" ) //  + + "<br>" + item.desc + "</a>"
			.appendTo( ul );
	};

}