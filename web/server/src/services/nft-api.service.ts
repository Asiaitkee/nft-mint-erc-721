
import axios, { AxiosRequestConfig } from 'axios';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { NFT } from '../../../common/nft'
import FormData = require('form-data');
import * as fs from 'fs';
import * as path from 'path';
import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';




export class NftApiService {
  private readonly execPromise: (command: string, options?: ExecOptions) => Promise<{ stdout: string | Buffer; stderr: string | Buffer }>;


  constructor() {
    this.execPromise = promisify(exec);
  }

async SendImage(uri: string, nftResult: any, nftToken: any): Promise<void> {
  const config: AxiosRequestConfig = {
    baseURL: process.env.REACT_APP_BASE_URL as string,
    headers: {
      Accept: 'image/*',
    },
    responseType: 'arraybuffer',
    maxBodyLength: Number(process.env.REACT_APP_MAX_FILE_SIZE),
    maxContentLength: Number(process.env.REACT_APP_MAX_FILE_SIZE),
  };

  try {
    const response = await axios.get(`ipfs/cat?path=${uri}`, config);
    const buffer = Buffer.from(response.data);

    // Define the directory for all NFTs and ensure it exists
    const allNFTsDirectory = path.join(process.cwd(), 'src', 'assets', 'all');
    if (!fs.existsSync(allNFTsDirectory)) {
      fs.mkdirSync(allNFTsDirectory, { recursive: true });
    }

  

    // Define full paths for the image
    const imagePathPNG = path.join(allNFTsDirectory, `${nftResult.ID}_${nftResult.Owner}_${nftToken.price}.png`);
    const imagePathJPEG = path.join(allNFTsDirectory, `${nftResult.ID}_${nftResult.Owner}_${nftToken.price}.jpg`);
    //const memberImagePathJPEG = path.join(memberDirectory, `${nftResult.ID}_${nftResult.Owner}_${nftToken.price}.jpg`);

    // Save the buffer as PNG file
    fs.writeFileSync(imagePathPNG, buffer);

    // Convert the PNG image to JPEG using ImageMagick
    await this.execPromise(`convert "${imagePathPNG}" "${imagePathJPEG}"`);

    console.log(`Image converted and saved successfully at ${imagePathJPEG}`);

    // Save the JPEG image to the member directory
   // fs.copyFileSync(imagePathJPEG, memberImagePathJPEG);
    //console.log(`JPEG image saved successfully at ${memberImagePathJPEG}`);

    // Define the server B URL
    const serverBUrl = 'http://localhost:3000/nft/save-image'; // Replace with Server B URL

    // Send the image to Server B
    const formData = new FormData();
    formData.append('file', fs.createReadStream(imagePathJPEG));
    formData.append('fileName', nftResult.Owner);
    formData.append('fileFormat', nftResult.FileFormat);

    const uploadResponse = await axios.post(serverBUrl, formData, {
      headers: formData.getHeaders(),
    });

    console.log('Image uploaded successfully to Server B:', uploadResponse.data);

    // Delete the original PNG file and JPEG files after successful upload
    fs.unlinkSync(imagePathPNG);
    fs.unlinkSync(imagePathJPEG);
    //fs.unlinkSync(memberImagePathJPEG);

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error downloading, saving, converting, or uploading the file:', error.message);
    } else {
      console.error('Unknown error occurred.');
    }
    throw error;
  }

}
}