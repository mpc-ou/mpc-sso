import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
