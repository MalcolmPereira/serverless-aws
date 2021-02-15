#! /bin/zsh
docker run -dit --memory 8m --network bridge --name imageclient -p 80:80 malcolmpereira/imageclientserverless