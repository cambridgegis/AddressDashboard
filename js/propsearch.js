var CAMBRIDGEMA = {};

var streetSweepLookup = {
	'A': 'Odd-side - 1st Wed<br />Even-side - 1st Thur',
	'B': 'Odd-side - 1st Mon<br />Even-side - 1st Tue',
	'C': 'Odd-side - 1st Fri<br />Even-side - 2nd Mon',
	'D': 'Odd-side - 2nd Tue<br />Even-side - 2nd Wed',
	'E': 'Odd-side - 2nd Thur<br />Even-side - 2nd Fri',
	'F': 'Odd-side - 3rd Mon<br />Even-side - 3rd Tue',
	'G': 'Odd-side - 3rd Wed<br />Even-side - 3rd Thur',
	'H': 'Odd-side - 3rd Fri<br />Even-side - 4th Mon',
	'J': 'Odd-side - 4th Tue<br />Even-side - 4th Wed',
	'K': 'Odd-side - 4th Thur<br />Even-side - 4th Fri'
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

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

CAMBRIDGEMA.config = {
	"queryBaseURL" : "http://gis.cambridgema.gov/ArcGIS/rest/services/AddressDashboard/",
	"initialSearchId" : "0"
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
			data.where = "Full_Addr like '"+permalink+"'";
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

	addressAutocomplete('.search_container_autocomplete', 
                        CAMBRIDGEMA.config.queryBaseURL + "MapServer/" + CAMBRIDGEMA.config.initialSearchId + "/query", 
						CAMBRIDGEMA.drawResult);

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
	$("#welcome_text").hide();
	$.each(CAMBRIDGEMA.dashboardPlugins, function (idx, plugin) {
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
			var AddrID = results.attributes.address_id;
			return CAMBRIDGEMA.execSimpleQuery({
				"resourceId" : 13,
				"query" : "BldgID = '" + results.attributes.BldgID + "'",
				"outFields" : "address_id",
				"success" : function(results) {
					var aFeatureIds = [];
					if (results.features.length === 0) {
						$('#building_addresses .results_value').html("Not a building address");
						$('#building_addresses').css('display','none');

						aFeatureIds.push(AddrID);
					} else {
						$.each(results.features, function(idx, oFeature) {
							aFeatureIds.push(oFeature.attributes.address_id);
						});
					}
					CAMBRIDGEMA.execSimpleQuery({
						"resourceId" : 12,
						"query" : "address_id in ('" + aFeatureIds.join("','") + "')",
						"success" : function(results) {
							if (results.features.length === 0) {
								$('#addr_db .results_value').html("No address records in MAF");
								return;
							}
							var addrs = [];
							var currentAddress = [];
							$.each(results.features, function(idx, feature) {	
								if (feature.attributes.address_id == AddrID) {
									currentAddress = feature;
								} else {
									addrs.push(feature.attributes.address);
								}
							});
							if (addrs.length === 0) {
								$('#building_addresses .results_value').html("None");
								$('#building_addresses').css('display','none');
							} else {
								$('#building_addresses .results_value').html(addrs.join("<br/>"));
								$('#building_addresses').css('display','block');
							}
							$('#addr_db .results_value').html(currentAddress.attributes.street_number + " " + currentAddress.attributes.street_short+ 
													  "<br/><a href='http://gis.cambridgema.gov/map/viewer.aspx?application=address&scaleby=4&targetlayer=Addresses&targetparams=" + currentAddress.attributes.street_number + "," + currentAddress.attributes.street_short.replace(" ","+") + "' target='_blank'>CityViewer Address Map</a>");

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
						$('#addr_assessing .results_value').html("No address records in Assessing DB");
						return;
					}
					$('#addr_assessing .results_value').html("Map-Lot: " + results.features[0].attributes.GIS_ID + "<br/>");
					var addrs = [];
					$.each(results.features, function(idx, feature) {	
							addrs.push(toTitleCase(feature.attributes.address));
					});
					$('#addr_assessing .results_value').append(addrs.join("<br/>"));

					var res = [];
					if ($.render.assess_info_template) {
						res.push({"blocknum":results.features[0].attributes.GIS_ID.split('-')[0], "lotnum":results.features[0].attributes.GIS_ID.split('-')[1]});
						$('#addr_assessing .results_link').html($.render.assess_info_template(res));
					}
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
					$('#trash_day .results_value').html(toTitleCase(results.features[0].attributes.TrashDay));
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
			var queries = [];
			$('#hist_info .results_value, #hist_info .no_results_value').html('');

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 5,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
				    var res = [];
				    if (results.features.length === 0) {
						//$('#hist_info .no_results_value').html("No Historic District Found");
						return;
					}
					$('#hist_info .results_value').append('<span class="sub_title">Local Historic District<br/></span>');
					$.each(results.features, function (idx, feature) {
					    if (feature.attributes.NAME === 'Old Cambridge') {
					        res.push({ "historic_value": feature.attributes.NAME, "historic_type": "", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/oldcambridgehd" });
					    } else {
					        res.push({ "historic_value": feature.attributes.NAME, "historic_type": "", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/fortwashingtonhc" });
					    }
					});
					if (!$.render.historic_url_template) {
					    $('#hist_info .results_value').append(res.join("<br/>"));
					} else {
					    $('#hist_info .results_value').append($.render.historic_url_template(res));
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 4,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
				    var res = [];
				    if (results.features.length === 0) {
						//$('#hist_info .no_results_value').html("No Conservation District Found");
						return;
					}
				    $('#hist_info .results_value').append('<span class="sub_title">Neighborhood Conservation District<br/></span>');
					$.each(results.features, function(idx, feature) {
							if (feature.attributes.NAME === 'Half Crown-Marsh' ) {
							    res.push({ "historic_value": feature.attributes.NAME, "historic_type": "Conservation District", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/halfcrownmarshncd" });
							} else if (feature.attributes.NAME === 'Avon Hill') {
							    res.push({ "historic_value": feature.attributes.NAME, "historic_type": "Conservation District", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/avonhillncd" });
							} else if (feature.attributes.NAME === 'Mid Cambridge') {
							    res.push({ "historic_value": feature.attributes.NAME, "historic_type": "Conservation District", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/midcambridgencd" });
							} else if (feature.attributes.NAME === 'Harvard Square') {
							    res.push({ "historic_value": feature.attributes.NAME, "historic_type": "Conservation District", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/harvardsquarencd" });
							}
					});
					if (!$.render.historic_url_template) {
					    $('#hist_info .results_value').append(res.join("<br/>"));
					} else {
					    $('#hist_info .results_value').append($.render.historic_url_template(res));
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
				"resourceId" : 3,
				"x" : results.geometry.x,
				"y" : results.geometry.y,
				"success" : function(results) {
				    var res = [];
				    if (results.features.length === 0) {
					    //$('#hist_info .no_results_value').html("No Protected Property Found");
						return;
					}
				    $('#hist_info .results_value').append('<span class="sub_title">Protected Property<br/></span>');
					$.each(results.features, function(idx, feature) {	
					    res.push({ "historic_value": feature.attributes.HISTORIC_N, "historic_type": "Protected Property" });
					});
					if (!$.render.historic_no_url_template) {
					    $('#hist_info .results_value').append(res.join("<br/>"));
					} else {
					    $('#hist_info .results_value').append($.render.historic_no_url_template(res));
					}
				}
			}));

			queries.push(CAMBRIDGEMA.execPointQuery({
			    "resourceId": 2,
			    "x": results.geometry.x,
			    "y": results.geometry.y,
			    "success": function (results) {
			        var res = [];
			        if (results.features.length === 0) {
			            //$('#hist_info .no_results_value').html("No National Historic District Found");
			            return;
			        }
			        $('#hist_info .results_value').append('<span class="sub_title">National Register<br/></span>');
			        $.each(results.features, function (idx, feature) {
			            res.push({ "historic_value": feature.attributes.LabelName, "historic_type": "National Historic District", "url": "http://www.cambridgema.gov/historic/districtsHistoricProperties/nationalregister" });
			        });
			        if (!$.render.historic_url_template) {
			            $('#hist_info .results_value').append(res.join("<br/>"));
			        } else {
			            $('#hist_info .results_value').append($.render.historic_url_template(res));
			        }
			    }
			}));

			var def = $.Deferred();
			$.when.apply(this,queries).then(function (q1, q2, q3, q4) {
				if ((!q1[0] || !q1[0].features || q1[0].features.length === 0) &&
					(!q2[0] || !q2[0].features || q2[0].features.length === 0) &&
                    (!q3[0] || !q3[0].features || q3[0].features.length === 0) &&
					(!q4[0] || !q4[0].features || q4[0].features.length === 0))
				{
					// no historic district results
				    $('#hist_info .no_results_value').html("This is not a designated historic building. <br/>Buildings over 50 years old may be subject to demolition review <br/><a href='http://www.cambridgema.gov/historic/contactforms/historicalcommission' target='_blank'>Contact the CHC for more information</a>");
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
					$('#census_info .results_value').html("Census Tract: " + res[0].value + "<br/>");

					if ($.render.census_info_template) {
						$('#census_info .results_link').html($.render.census_info_template( res ));
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
