# Demo imagery

The demo displays NASA GIBS `MODIS_Terra_CorrectedReflectance_TrueColor` daily composites over the Aral Sea for **2005-07-15** and **2023-07-15**. These are real dated satellite visualizations, not two treatments of the same basemap. Both tile URLs returned JPEG imagery when checked on 2026-10-10.

The [GIBS WMTS documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) defines the dated REST tile path; the demo uses its EPSG:3857 `GoogleMapsCompatible_Level9` matrix with MapLibre's `{z}/{y}/{x}` tile order. [NASA's layer description](https://gis.earthdata.nasa.gov/portal/home/item.html?id=780c03ffe3dc42e8bb03ca3b07bb283e) identifies this as a true-color daily composite with maximum resolution around 250 m/pixel at the equator, available since 2000. MapLibre overzooms above level 9.

NASA's [GIBS acknowledgement](https://nasa-gibs.github.io/gibs-api-docs/) is shown below the map, and the source attribution is included in both raster styles. See [NASA Earthdata's data use guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy). The demo does not bundle or redistribute tile imagery; the browser requests it from GIBS.

Cloud cover, different acquisition conditions and the coarse native resolution can affect appearance. This visual comparison alone does not quantify water extent or establish a cause for any difference. Use analysis-ready data and a documented method for measurement. Availability of the public tile service is outside this package's control.
