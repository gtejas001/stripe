-------------------------------------
-- Date 26/11/2021
-------------------------------------
CREATE TABLE admins(
   id INT NOT NULL AUTO_INCREMENT,
   first_name VARCHAR(40) NOT NULL,
   last_name VARCHAR(40) NOT NULL,
   email VARCHAR(100) NOT NULL,
   password LONGTEXT NOT NULL,
   created_at TIMESTAMP,
   PRIMARY KEY ( id )
);

CREATE TABLE users(
   id INT NOT NULL AUTO_INCREMENT,
   stripe_customer_id VARCHAR(40) NULL,
   created_by INT NOT NULL,
   CONSTRAINT `fk_created_by`
    FOREIGN KEY (created_by) REFERENCES admins (id)
    ON DELETE CASCADE
    ON UPDATE RESTRICT,
   first_name VARCHAR(40) NOT NULL,
   last_name VARCHAR(40) NOT NULL,
   email VARCHAR(100) NOT NULL,
   password LONGTEXT NULL,
   isActive BOOLEAN DEFAULT false,
   activationToken LONGTEXT NULL,
   created_at TIMESTAMP,
   PRIMARY KEY ( id )
);