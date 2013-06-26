var CAMBRIDGEMA = {};

var streetSweepLookup = {
	'A': '<b>Odd-side - 1st Wed<br />Even-side - 1st Thur</b>',
	'B': '<b>Odd-side - 1st Mon<br />Even-side - 1st Tue</b>',
	'C': '<b>Odd-side - 1st Fri<br />Even-side - 2nd Mon</b>',
	'D': '<b>Odd-side - 2nd Tue<br />Even-side - 2nd Wed</b>',
	'E': '<b>Odd-side - 2nd Thur<br />Even-side - 2nd Fri</b>',
	'F': '<b>Odd-side - 3rd Mon<br />Even-side - 3rd Tue</b>',
	'G': '<b>Odd-side - 3rd Wed<br />Even-side - 3rd Thur</b>',
	'H': '<b>Odd-side - 3rd Fri<br />Even-side - 4th Mon</b>',
	'J': '<b>Odd-side - 4th Tue<br />Even-side - 4th Wed</b>',
	'K': '<b>Odd-side - 4th Thur<br />Even-side - 4th Fri</b>'
};

var nhoodLookup = {
	'Agassiz': '8',
	'Area 2/MIT': '2',
	'Area Four': '4',
	'Cambridge Highlands': '12',
	'Cambridgeport': '5',
	'East Cambridge': '1',
	'Mid-Cambridge': '6',
	'Neighborhood Nine': '9',
	'North Cambridge': '11',
	'Riverside': '7',
	'Strawberry Hill': '13',
	'Wellington-Harrington': '3',
	'West Cambridge': '10'
};

CAMBRIDGEMA.config = {
	"queryBaseURL" : "http://gis.cambridgema.gov/ArcGIS/rest/services/AddressDashboard/",
	"initialSearchId" : "0"
}
CAMBRIDGEMA.generateSearchTree = function(aItems) {
	if (aItems.length == 2) {
		return [ [ aItems[0], aItems[1] ], [ aItems[1], aItems[0] ] ];
	}
	var searchTree = [];
	for (var i = 0; i < aItems.length; i++) {
		var item = aItems[i];
		var remaining = aItems.slice(0);
		remaining.splice(i,1);
		var subTree = CAMBRIDGEMA.generateSearchTree(remaining);
		for (var j = 0; j < subTree.length; j++) {
			searchTree.push( [item].concat(subTree[j]) );
		}
	}
	return searchTree;
}
CAMBRIDGEMA.execSimpleQuery = function(cfg) {

	var data = {
		"outFields" : (cfg.outFields ? cfg.outFields : "*"),
		"f" : "pjson"
	};
	data.where = cfg.query;
	return jQuery.ajax({
		"url": CAMBRIDGEMA.config.queryBaseURL + "MapServer/" + cfg.resourceId + "/query",
		"dataType":"jsonp",
		"data" : data
	}).success(function(results) {
		//CAMBRIDGEMA.resultCache[cfg.resourceId] = results;
		cfg.success(results);
	});
};
CAMBRIDGEMA.execPointQuery = function(cfg) {
	var data = {
		"geometryType" : "esriGeometryPoint",
		"geometry" : cfg.x + "," + cfg.y,
		"f" : "json",
		"outFields" : cfg.outFields ? cfg.outFields : "*"
	};
	cfg.inSR && (data.inSR = cfg.inSR);
	cfg.outSR && (data.outSR = cfg.outSR);
	return jQuery.ajax({
		"url": CAMBRIDGEMA.config.queryBaseURL + "MapServer/" + cfg.resourceId + "/query",
		"dataType":"jsonp",
		"data" : data
	}).success(function(results) {
		cfg.success(results);
	});
};
//CAMBRIDGEMA.resultCache = {};
CAMBRIDGEMA.epsg2249 = new Proj4js.Proj('EPSG:2249');
CAMBRIDGEMA.epsg4326 = new Proj4js.Proj('EPSG:4326');
CAMBRIDGEMA.epsg26986 = new Proj4js.Proj('EPSG:26986');
CAMBRIDGEMA.epsg2960 = new Proj4js.Proj('EPSG:2960');
jQuery(document).ready(function () {

	var permalink = $.bbq.getState("d");
	if (permalink) {
		var data = {
			"outFields" : "*",
			"f" : "pjson"
		};

/*	
		if (permalink.indexOf(" ") !== -1) {
			var aTerms = permalink.split(" ");
			var aSearchTree = CAMBRIDGEMA.generateSearchTree(aTerms);
			var aQueries = [];
			for (var i = 0; i < aSearchTree.length; i++) {
				aQueries.push("( Full_Addr like '%" + aSearchTree[i].join("%") + "%')");
			}
			data.where = aQueries.join(" OR ");
			//console.log(data.where);
		} else {
*/
			data.where = "Full_Addr like '%"+permalink+"%'";
/*
		}
*/
		jQuery.ajax({
			"url": CAMBRIDGEMA.config.queryBaseURL + "MapServer/" +
						CAMBRIDGEMA.config.initialSearchId+ "/query",
			"dataType":"jsonp",
			"data" : data,
			"success" :function (data) {
				$('.search_container input').val(permalink);
				CAMBRIDGEMA.drawResult(data.features[0]);
			}
		});
	}

	$('.search_container_autocomplete')
		.autocomplete({
		"minLength" : 2,
		"open": function(event, ui) {
			$(this).autocomplete("widget").css({
				"width": "600px",
				"max-width": "100%",
				"max-height": "100%",
				"overflow-y" : "auto",
				"overflow-x" : "hidden",
				"padding-right" : "20px"
			});
		},
		"source" : function (request,response) {
			var data = {
				"outFields" : "*",
				"f" : "pjson"
			};
		
			if (request.term.indexOf(" ") !== -1) {
				var aTerms = request.term.split(" ");
				var aSearchTree = CAMBRIDGEMA.generateSearchTree(aTerms);
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
				"url": CAMBRIDGEMA.config.queryBaseURL + "MapServer/" +
							CAMBRIDGEMA.config.initialSearchId+ "/query",
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
			CAMBRIDGEMA.drawResult(data);
		}

	}).data( "autocomplete" )._renderItem = function( ul, item ) {
		return $( "<li></li>" )
			.css({"font-size":"12px"})
			.data( "item.autocomplete", item )
			.append( "<a>"+ item.label + "</a>" ) //  + + "<br>" + item.desc + "</a>"
			.appendTo( ul );
	};

	$('#permalink_image').on("click",function() {
		$( '#permalink_txt' ).val(document.location.href);
		$( "#permalink_dialog" ).dialog({
			width: "800px",
			height: 60,
			resizable: false,
			"position": {
				my: "right top", at: "right bottom", of: $('#permalink_image')
			}
		});
		$('#permalink_txt').focus().select();
	});

});

CAMBRIDGEMA.drawResult = function(data) {
	var plugins = [];
	$.each(CAMBRIDGEMA.dashboardPlugins, function(idx, plugin) {
		plugins.push(plugin.render(data));
	});

	$(".results").fadeOut(200);
	$('#search_indicator').fadeIn(500);

	$.when.apply(this,plugins).then(function () {
		$.bbq.removeState();
		$.bbq.pushState({"d":$('.search_container input').val()});
		$('#search_indicator').fadeOut(500);
		$(".results").fadeIn(1000);
	});
}

CAMBRIDGEMA.dashboardPlugins = {

	"addresses_from_dashboard_database" : {
		render: function(results) {
			var BldgID = results.attributes.BldgID;  // Store for later URL creation
			return CAMBRIDGEMA.execSimpleQuery({
				"resourceId" : 13,
				"query" : "BldgID = '" + results.attributes.BldgID + "'",
				"outFields" : "address_id",
				"success" : function(results) {
					if (results.features.length === 0) {
						$('#addr_db .results_value').html("No addresses records in MAF");
						return;
					}
					var aFeatureIds = [];
					$.each(results.features, function(idx, oFeature) {
						aFeatureIds.push(oFeature.attributes.address_id);
					});
					CAMBRIDGEMA.execSimpleQuery({
						"resourceId" : 12,
						"query" : "address_id in ('" + aFeatureIds.join("','") + "')",
						"success" : function(results) {
							if (results.features.length === 0) {
								$('#addr_db .results_value').html("No addresses records in MAF");
								return;
							}
							var addrs = [];
							$.each(results.features, function(idx, feature) {	
								addrs.push(feature.attributes.address);
							});
							$('#addr_db .results_value').html(addrs.join("<br/>") + 
															  "<br/><a href='http://gis.cambridgema.gov/map/viewer.aspx?action=select&proximity=0ft&application=address&targetlayer=Buildings&maptab=Address&targetIDs=" + BldgID + "' target='_blank'>Address CityViewer</a>");
						}
					});
				}
			});
		}
	},
	"addresses_from_vision" : {
		render: function(results) {
			return CAMBRIDGEMA.execSimpleQuery({
				"resourceId" : 15,
				"query" : "GIS_ID = '" + results.attributes.ml + "'",
				"success" : function(results) {
					if (results.features.length === 0) {
						$('#addr_assessing .results_value').html("No addresses records in Assessing DB");
						return;
					}
					var addrs = [];
					$.each(results.features, function(idx, feature) {	
						addrs.push(feature.attributes.address);
					});
					$('#addr_assessing .results_value').html(addrs.join("<br/>"));

					$('#assessing_more_data').unbind();
					$('#assessing_more_data').on('click',function() {
						var blocknum = results.features[0].attributes.GIS_ID.split('-')[0];
						var lotnum = results.features[0].attributes.GIS_ID.split('-')[1];
						$('#assessing_search_form input[name=blockNumber]').val(blocknum);
						$('#assessing_search_form input[name=lotNumber]').val(lotnum);
						$('#assessing_search_form').submit();
					});
				}
			});
		}
	},
	"points_of_interest" : {
		render: function(results) {
			return CAMBRIDGEMA.execSimpleQuery({
				"resourceId" : 14,
				"query" : "address_id = '" + results.attributes.address_id + "'",
				"success" : function(results) {
					if (results.features.length === 0) {
						$('#poi .results_value').html("No Points of Interest Found");
						$('#poi').css('display','none');
						return;
					}
					$('#poi').css('display','block');
					var pois = [];
					$.each(results.features, function(idx, feature) {	
						pois.push(feature.attributes.poi_name);
					});
					$('#poi .results_value').html(pois.join("<br/>"));
				}
			});
		}
	},
	"neighborhood_trashday_streetsweeping_zipcode" : {
		render: function(results) {
			return CAMBRIDGEMA.execSimpleQuery({
				"resourceId" : 12,
				"query" : "address_id = '" + results.attributes.address_id + "'",
				"success" : function(results) {
					var res = [];
					if (results.features.length === 0) {
						$('#neighborhood .results_value').html("Neighborhood not listed");
						return;
					}
					if (!$.render.nhood_info_template) {
						$('#neighborhood .results_value').html(results.features[0].attributes.NBHD);
					} else {
						res.push({ "value" : nhoodLookup[results.features[0].attributes.NBHD], "name" : results.features[0].attributes.NBHD });
						$('#neighborhood .results_value').html($.render.nhood_info_template( res ));
					}
					$('#trash_day .results_value').html(results.features[0].attributes.TrashDay);
					var sweepText = '';
					var sweepDist = 'None';
					// For blank, null, or 'NA' values show 'None'
					if (results.features[0].attributes.SweepDist && results.features[0].attributes.SweepDist != '' & results.features[0].attributes.SweepDist != 'NA') {
						// Group J1, J2, J3 into just J.  The rest are straight lookups.
						sweepDist = results.features[0].attributes.SweepDist[0];
						sweepText = streetSweepLookup[sweepDist];
					}
					$('#st_sweep_dist .results_value').html(sweepDist + "<br />" + sweepText);
					$('#zip_code .results_value').html(results.features[0].attributes.zip);
				}
			});
		}
	},
	"map" : {
		render: function(results) {
			var meters = Proj4js.transform(CAMBRIDGEMA.epsg2249, CAMBRIDGEMA.epsg26986, {x: results.geometry.x, y: results.geometry.y});
			var latlon = Proj4js.transform(CAMBRIDGEMA.epsg2249, CAMBRIDGEMA.epsg4326, {x: results.geometry.x, y: results.geometry.y});
			var utm = Proj4js.transform(CAMBRIDGEMA.epsg2249, CAMBRIDGEMA.epsg2960, {x: results.geometry.x, y: results.geometry.y});

			$('#map img').attr('src','http://maps.googleapis.com/maps/api/staticmap?center=' + latlon.y + "," + latlon.x + '&zoom=16&size=350x250&maptype=roadmap&sensor=false&visual_refresh=true&markers=color:blue|' + results.attributes.Full_Addr + ',%20Cambridge,%20MA');
			$('#map a').
				attr('href','http://maps.google.com/?q=' + results.attributes.Full_Addr + '%20Cambridge,%20MA')
				.attr('target','_blank');
			$('#streetview img').attr('src','http://maps.googleapis.com/maps/api/streetview?size=350x250&location=' + latlon.y + "," + latlon.x + '&sensor=false');

			$('#sp_ft_coordinates .results_value').html(Math.round(results.geometry.x,0) + ",&nbsp; " + Math.round(results.geometry.y,0));

			$('#sp_m_coordinates .results_value').html(Math.round(meters.x) + ",&nbsp; " + Math.round(meters.y));
			$('#latlon_coordinates .results_value').html(latlon.x.toFixed(5) + ",&nbsp; " + latlon.y.toFixed(5));
			$('#utm_coordinates .results_value').html(Math.round(utm.x) + ",&nbsp; " + Math.round(utm.y));

			$('#streetview a')
				.attr('href','https://maps.google.com/maps?q=' + results.attributes.Full_Addr + '+Cambridge,+MA&layer=c&cbp=12,0,0,0,0&cbll=' + latlon.y + "," + latlon.x)
				.attr('target','_blank');

			var def = $.Deferred();
			def.resolve();
			return def;
		}
	},
	"historic_info" : {
		render: function(results) {
			var res = [];
			var queries = [];
			$('#hist_info .results_value').html('');
			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 5,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					if (results.features.length === 0) {
						//$('#hist_info .results_value').html("No Historic District Found");
						return;
					}
					$.each(results.features, function(idx, feature) {	
						res.push({ "value" : feature.attributes.NAME, "type" : "(Historic District)"});
					});
					if (!$.render.historic_info_template) {
						$('#hist_info .results_value').append(res.join("<br/>"));
					} else {
						$('#hist_info .results_value').append($.render.historic_info_template( res ));
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 4,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					if (results.features.length === 0) {
						//$('#hist_info .results_value').html("No Conservation District Found");
						return;
					}
					$.each(results.features, function(idx, feature) {
						res.push({ "value" : feature.attributes.NAME, "type" : "(Conservation District)"});
					});
					if (!$.render.historic_info_template) {
						$('#hist_info .results_value').append(res.join("<br/>"));
					} else {
						$('#hist_info .results_value').append($.render.historic_info_template( res ));
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 3,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					if (results.features.length === 0) {
						//$('#hist_info .results_value').html("No Protected Property Found");
						return;
					}
					$.each(results.features, function(idx, feature) {	
						res.push({ "value" : feature.attributes.HISTORIC_N, "type" : "(Protected Property)"});
					});
					if (!$.render.protected_info_template) {
						$('#hist_info .results_value').append(res.join("<br/>"));
					} else {
						$('#hist_info .results_value').append($.render.protected_info_template( res ));
					}
				}
			}));

			var def = $.Deferred();
			$.when.apply(this,queries).then(function (q1, q2, q3) {
				if ((!q1[0] || !q1[0].features || q1[0].features.length === 0) &&
					(!q2[0] || !q2[0].features || q2[0].features.length === 0) &&
					(!q3[0] || !q3[0].features || q3[0].features.length === 0))
				{
					// no historic district results
					$('#hist_info .results_value').html("This property is not in a Historic District");
				}
				def.resolve();
			});
			return def;
		}
	},
	"elect_info" : {
		render: function(results) {
			var queries = [];
			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 7,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					$('#elect_info #ward').html("Ward " + results.features[0].attributes.Ward + ", Precinct " + results.features[0].attributes.Precinct);
					if (results.features[0].attributes.Location_Note != ' ') {
						$('#elect_info #vote').html("Voting Location: " + results.features[0].attributes.Location + " (" + results.features[0].attributes.Location_Note + ")");
					} else {
						$('#elect_info #vote').html("Voting Location: " + results.features[0].attributes.Location);
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 8,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					$('#elect_info #st_rep').html("State Rep: " + results.features[0].attributes.REP);
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 9,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					if (!results.features[0].attributes.SENATOR) {
						$('#elect_info #st_sen').html("State Senator: ");
						return;
					}
					$('#elect_info #st_sen').html("State Senator: " + results.features[0].attributes.SENATOR);
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 10,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					$('#elect_info #us_rep').html("US Rep: " + results.features[0].attributes.Congressman);
				}
			}));

			var def = $.Deferred();
			$.when.apply(this,queries).then(function () {
				def.resolve();
			});
			return def;
		}
	},
	"census_info" : {
		render: function(results) {
			var res = [];
			return CAMBRIDGEMA.execPointQuery({
				"resourceId" : 11,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
					if (results.features.length === 0) {
						//$('#hist_info .results_value').html("No Protected Property Found");
						return;
					}
					$.each(results.features, function(idx, feature) {	
						res.push({ "value" : results.features[0].attributes.TRACTCE10 });
					});
					if (!$.render.census_info_template) {
						$('#census_info .results_value').html("Census Tract: " + res[0].value);
					} else {
						$('#census_info .results_value').html("Census Tract: " + $.render.census_info_template( res ));
					}
				}
			});
		}
	},
	"sample_plugin" : {
		render: function(results) {

		}
	}
};
