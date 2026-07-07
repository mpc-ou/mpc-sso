import { Controller, Get } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('.well-known')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('openid-configuration')
  getConfiguration() {
    return this.discoveryService.getOpenIdConfiguration();
  }

  @Get('jwks.json')
  getJwks() {
    return this.discoveryService.getJwks();
  }
}
