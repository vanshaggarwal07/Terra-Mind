"""Generic registrations for the remaining site/API sources in the seed.

These reuse the generic crawlers so the full registry is runnable now. Sources
requiring specialized handling arrive in later phases: satellite (P4.3),
x_social (P1.10); dataset-download sources (cgwb, dem) are added when their
loaders land.
"""

from __future__ import annotations

from ingestion.crawlers.base import register_crawler
from ingestion.crawlers.generic import GenericApiCrawler, GenericSiteCrawler, PdfDiscoveryMixin


@register_crawler("noida_authority")
class NoidaAuthorityCrawler(PdfDiscoveryMixin, GenericSiteCrawler):
    pass


@register_crawler("jewar_airport")
class JewarAirportCrawler(PdfDiscoveryMixin, GenericSiteCrawler):
    pass


@register_crawler("builder_press")
class BuilderPressCrawler(GenericSiteCrawler):
    pass


@register_crawler("cwc_imd")
class CwcImdCrawler(GenericApiCrawler):
    pass
