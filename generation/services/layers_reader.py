import os
from os import path
from typing import List

from .. import utils
from ..config import config
from ..models import Feature, Layer


def split_feature_file(feature_file: str) -> tuple:
    without_extension = path.splitext(feature_file)[0]
    feature_name, feature_rarity, *feature_set_tuple = without_extension.split(config.rarity_separator)
    feature_set = feature_set_tuple[0] if len(feature_set_tuple) == 1 else None

    return feature_name, float(feature_rarity), feature_set


def read_feature(feature_file: str, layer_dir: str) -> Feature:
    feature_path = utils.feature_path(feature_file, layer_dir, False)
    feature_name, feature_rarity, feature_set = split_feature_file(feature_file)

    return Feature(feature_name, feature_path, feature_rarity, feature_set)


def split_layer_dir(layer_dir: str) -> tuple:
    without_extension = path.splitext(layer_dir)[0]
    (layer_name, layer_order) = without_extension.split(config.order_separator)

    return (layer_name, int(layer_order))


def read_layer(layer_dir: str) -> Layer:
    (layer_name, layer_order) = split_layer_dir(layer_dir)
    layer_path = utils.layer_path(layer_dir)
    feature_files = os.listdir(layer_path)
    features = [read_feature(feature_file, layer_dir) for feature_file in feature_files]

    return Layer(layer_name, layer_order, features)


def read_layers() -> List[Layer]:
    layer_names = os.listdir(config.layers_dir)
    layers = list(map(read_layer, layer_names))
    layers.sort(key=lambda layer: layer.order)

    return layers
