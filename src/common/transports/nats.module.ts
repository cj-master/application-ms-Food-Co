import { ClientsModule, Transport } from '@nestjs/microservices'
import { envs, NATS_SERVICE } from 'src/config'
import { Module } from '@nestjs/common'

@Module({
  imports: [
    ClientsModule.register([
      { 
        name: NATS_SERVICE, 
        transport: Transport.NATS,
        options: {
          servers: envs.NATS_SERVER
        } 
      }
    ])
  ],
  
  exports: [
    ClientsModule.register([
      { 
        name: NATS_SERVICE, 
        transport: Transport.NATS,
        options: {
          servers: envs.NATS_SERVER
        } 
      }
    ])
  ]
})

export class NatsModule {}
