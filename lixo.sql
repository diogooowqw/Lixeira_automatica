CREATE DATABASE IF NOT EXISTS lixo;

CREATE TABLE `lixocoletado` (
    `id` int NOT NULL AUTO_INCREMENT,
    `data` date NOT NULL,
    `horario` time NOT NULL,
    `tipo` varchar(250) NOT NULL,
    PRIMARY KEY (`id`)
)
USE lixo; -- ou o nome do banco configurado no db.js

