#!/usr/bin/env bash

if [ $# -ne 2 -a $# -ne 3 ]
then
    echo "usage: $0 [-v] MNIST_TEST_DATA_DIR SERVER_BASE_URL"
    exit 1
fi

verbose=0
if [ $# -eq 3 ]
then
    if [ $1 = '-v' ]
    then
	verbose=1
	shift
    else
	echo "invalid first argument $1"
	echo "usage: $0 [-v] MNIST_TEST_DATA_DIR SERVER_BASE_URL"
	exit 1
    fi
fi	 


DIR=$1
SERVE=$2

if [ ! -d "$DIR" ]
then
    echo "'$DIR' is not a directory"
    exit 1
fi

for f in $DIR/*.b64
do
    f1=`basename $f`
    id=$(curl -s -k -X POST -H 'content-type: application/json' \
              -d `cat $f` $SERVE/knn/images \
             | jq -r .id )
    [ $? -eq 0 ] || { echo "POST $f1 failed"; exit 1; }

    knnOut=$(curl -s -k $SERVE/knn/labels/$id)
    [ $? -eq 0 ] || { echo "labeling $f1/$id failed"; exit 1; }

    knnLabel=$(echo "$knnOut" | jq -r .label)
    [ $? -eq 0 ] || { echo "no label for $f1/$id in output '$knnOut'"; exit 1; }

    label=$(cat $DIR/$(basename $f .b64).label)

    if [ "$label" != "$knnLabel" ]
    then    
	echo "image $f1: label '$label' incorrectly classified as '$knnLabel'"
    elif [ $verbose -eq 1 ]
    then
	 echo "image $f1 ok ('$label'=='$knnLabel')"
    fi
    
done
